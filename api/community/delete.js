/**
 * Community Agent Delete API
 *
 * This serverless function handles deleting agents from the community gallery.
 * Requires admin password for authorization.
 *
 * Environment Variables Required:
 * - GITHUB_TOKEN: Personal access token with repo write permissions
 * - GITHUB_REPO: Repository in format "owner/repo" (e.g., "skwapong/TD-Agent-Builder")
 */

const https = require('https');

const GITHUB_API_BASE = 'https://api.github.com';
const COMMUNITY_FILE_PATH = 'community-agents.json';
const ADMIN_PASSWORD = '!PMAgentSquadAdmin!';

// Helper function to make HTTPS requests
function httpsRequest(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const reqOptions = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
        };

        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    json: () => Promise.resolve(JSON.parse(data)),
                    text: () => Promise.resolve(data),
                });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }

        req.end();
    });
}

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { agentId, adminPassword } = req.body;

        // Validate admin password
        if (adminPassword !== ADMIN_PASSWORD) {
            res.status(403).json({
                error: 'Unauthorized',
                message: 'Invalid admin password'
            });
            return;
        }

        // Validate required fields
        if (!agentId) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'agentId is required'
            });
            return;
        }

        // Get GitHub credentials from environment
        const githubToken = (process.env.GITHUB_TOKEN || '').trim();
        const githubRepo = (process.env.GITHUB_REPO || 'skwapong/TD-Agent-Builder').trim();

        if (!githubToken) {
            console.error('GITHUB_TOKEN not configured');
            res.status(500).json({
                error: 'Server configuration error',
                message: 'GitHub integration not configured. Please contact the administrator.'
            });
            return;
        }

        // Fetch current community-agents.json from GitHub
        const [owner, repo] = githubRepo.split('/');
        const getFileUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${COMMUNITY_FILE_PATH}`;

        const fileResponse = await httpsRequest(getFileUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'TD-Agent-Builder',
            },
        });

        if (!fileResponse.ok) {
            const errorText = await fileResponse.text();
            console.error('Failed to fetch community file:', fileResponse.status, errorText);
            throw new Error('Failed to fetch community agents file');
        }

        const fileData = await fileResponse.json();
        const currentContent = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
        const sha = fileData.sha;

        // Find and remove the agent
        const agentIndex = currentContent.agents.findIndex(a => a.id === agentId);
        if (agentIndex === -1) {
            res.status(404).json({
                error: 'Not found',
                message: 'Agent not found in community gallery'
            });
            return;
        }

        const deletedAgent = currentContent.agents[agentIndex];
        currentContent.agents.splice(agentIndex, 1);
        currentContent.lastUpdated = new Date().toISOString();

        // Update file on GitHub
        const newContent = Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64');

        const updateResponse = await httpsRequest(getFileUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'TD-Agent-Builder',
            },
        }, JSON.stringify({
            message: `Delete community agent: ${deletedAgent.name}`,
            content: newContent,
            sha: sha,
            branch: 'main',
        }));

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Failed to update file:', updateResponse.status, errorText);
            throw new Error('Failed to delete agent from community');
        }

        const updateResult = await updateResponse.json();

        res.status(200).json({
            success: true,
            message: 'Agent deleted successfully',
            agentId: agentId,
            agentName: deletedAgent.name,
            commit: updateResult.commit?.sha,
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: 'Failed to delete',
            message: error.message || 'An unexpected error occurred'
        });
    }
};
