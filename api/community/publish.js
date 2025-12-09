/**
 * Community Agent Publish API
 *
 * This serverless function handles publishing agents to the community gallery.
 * It uses GitHub API to update the community-agents.json file in the repository.
 *
 * Environment Variables Required:
 * - GITHUB_TOKEN: Personal access token with repo write permissions
 * - GITHUB_REPO: Repository in format "owner/repo" (e.g., "skwapong/TD-Agent-Builder")
 */

const https = require('https');

const GITHUB_API_BASE = 'https://api.github.com';
const COMMUNITY_FILE_PATH = 'community-agents.json';

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
        const { name, description, author, tags, data } = req.body;

        // Validate required fields
        if (!name || !author || !data) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'name, author, and data are required'
            });
            return;
        }

        // Get GitHub credentials from environment
        // Trim to remove any trailing newlines or whitespace
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

        // Generate new agent ID
        const newId = `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create new agent entry
        const newAgent = {
            id: newId,
            name: name,
            description: description || '',
            author: author,
            tags: tags || [],
            downloads: 0,
            publishedAt: new Date().toISOString(),
            data: data,
        };

        // Add to agents array
        currentContent.agents = currentContent.agents || [];
        currentContent.agents.unshift(newAgent); // Add at beginning (newest first)
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
            message: `Add community agent: ${name}`,
            content: newContent,
            sha: sha,
            branch: 'main',
        }));

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Failed to update file:', updateResponse.status, errorText);
            throw new Error('Failed to publish agent to community');
        }

        const updateResult = await updateResponse.json();

        res.status(200).json({
            success: true,
            message: 'Agent published successfully',
            agentId: newId,
            commit: updateResult.commit?.sha,
        });

    } catch (error) {
        console.error('Publish error:', error);
        res.status(500).json({
            error: 'Failed to publish',
            message: error.message || 'An unexpected error occurred'
        });
    }
};
