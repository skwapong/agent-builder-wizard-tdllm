/**
 * TD LLM API Integration for Agent Builder Wizard
 *
 * This replaces the Claude Code CLI approach with direct TD LLM API calls
 * through a local proxy server that handles authentication.
 */

class TDLLMAPI {
    constructor() {
        // Detect environment and set proxy URL accordingly
        // Use relative URLs for production (Vercel), absolute for local dev
        this.proxyUrl = this.detectProxyUrl();
        this.agentId = null;
        this.currentChatId = null;
        this.currentAbortController = null;

        // Rate limiting configuration
        this.rateLimitConfig = {
            maxRequestsPerMinute: 10,      // Max requests per minute
            minRequestInterval: 2000,       // Minimum 2 seconds between requests
            maxRetries: 3,                  // Max retry attempts
            baseRetryDelay: 2000,           // Base delay for exponential backoff (2s)
            maxRetryDelay: 30000,           // Max retry delay (30s)
            cooldownAfterError: 5000        // Cooldown after any error (5s)
        };

        // Rate limiting state
        this.rateLimitState = {
            requestTimestamps: [],          // Timestamps of recent requests
            lastRequestTime: 0,             // Last request timestamp
            isRateLimited: false,           // Currently rate limited
            rateLimitResetTime: 0,          // When rate limit resets
            consecutiveErrors: 0            // Track consecutive errors
        };

        // Available models via TD LLM API
        this.availableModels = [
            { id: 'anthropic.claude-4.5-sonnet', name: 'Claude 4.5 Sonnet', provider: 'Anthropic', recommended: true },
            { id: 'anthropic.claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic' },
            { id: 'anthropic.claude-4-opus', name: 'Claude 4 Opus', provider: 'Anthropic' },
            { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet V2', provider: 'Anthropic' },
            { id: 'anthropic.claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
            { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
            { id: 'anthropic.claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
            { id: 'openai.gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
            { id: 'openai.gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
            { id: 'google.gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
            { id: 'google.gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
            { id: 'amazon.nova-pro-v1:0', name: 'Amazon Nova Pro', provider: 'Amazon' },
            { id: 'amazon.nova-lite-v1:0', name: 'Amazon Nova Lite', provider: 'Amazon' }
        ];

        this.model = 'anthropic.claude-3.5-sonnet';
        this.connectionStatus = 'unknown';

        // Load saved settings
        this.loadSettings();

        console.log('🌐 TD LLM API initialized');
        console.log('📡 Proxy URL:', this.proxyUrl);
    }

    detectProxyUrl() {
        // Check if running on localhost (development)
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.protocol === 'file:';

        if (isLocalhost) {
            // Local development - use absolute URL to local proxy
            return 'http://localhost:3001';
        } else {
            // Production (Vercel, etc.) - use relative URLs
            // The proxy-server.js handles /api/* routes
            return '';
        }
    }

    loadSettings() {
        try {
            const savedAgentId = localStorage.getItem('td_agent_id');
            const savedModel = localStorage.getItem('td_model');

            if (savedAgentId) this.agentId = savedAgentId;
            if (savedModel) this.model = savedModel;
            // Note: proxyUrl is auto-detected, don't load from localStorage
        } catch (e) {
            console.warn('Could not load settings from localStorage:', e);
        }
    }

    saveSettings() {
        try {
            if (this.agentId) {
                localStorage.setItem('td_agent_id', this.agentId);
            } else {
                localStorage.removeItem('td_agent_id');
            }
            if (this.model) {
                localStorage.setItem('td_model', this.model);
            }
            if (this.proxyUrl) {
                localStorage.setItem('td_proxy_url', this.proxyUrl);
            }
        } catch (e) {
            console.warn('Could not save settings to localStorage:', e);
        }
    }

    // Agent ID management
    setAgentId(agentId) {
        this.agentId = agentId;
        this.saveSettings();
    }

    getAgentId() {
        return this.agentId;
    }

    hasAgentId() {
        return !!this.agentId && this.agentId.trim() !== '';
    }

    // Proxy URL management
    setProxyUrl(url) {
        this.proxyUrl = url;
        this.saveSettings();
    }

    getProxyUrl() {
        return this.proxyUrl;
    }

    // Model management
    setModel(modelId) {
        this.model = modelId;
        this.saveSettings();
    }

    getModel() {
        return this.model;
    }

    getAvailableModels() {
        return this.availableModels;
    }

    // Compatibility with old claude-api.js interface
    setApiKey(key) {
        // API key is handled by proxy server
        console.log('API key is handled by the proxy server');
    }

    getApiKey() {
        return 'proxy-handled';
    }

    hasApiKey() {
        return true; // Proxy handles authentication
    }

    isConfigured() {
        return this.connectionStatus === 'connected';
    }

    // Check connection to proxy server
    async checkConnection() {
        try {
            const response = await fetch(`${this.proxyUrl}/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.connectionStatus = 'connected';
                console.log('✅ Connected to TD LLM proxy server');
                return { connected: true, message: data.message || 'Connected' };
            } else {
                this.connectionStatus = 'error';
                return { connected: false, message: `Server returned ${response.status}` };
            }
        } catch (error) {
            this.connectionStatus = 'disconnected';
            console.error('❌ Cannot connect to proxy server:', error.message);
            return { connected: false, message: error.message };
        }
    }

    buildHeaders(stream = false) {
        const headers = {
            'Content-Type': 'application/vnd.api+json'
        };

        if (stream) {
            headers['Accept'] = 'text/event-stream';
        } else {
            headers['Accept'] = 'application/vnd.api+json';
        }

        return headers;
    }

    // ========================================
    // Rate Limiting Methods
    // ========================================

    /**
     * Check if we can make a request based on rate limits
     * @returns {Object} { canProceed: boolean, waitTime: number, reason: string }
     */
    checkRateLimit() {
        const now = Date.now();
        const state = this.rateLimitState;
        const config = this.rateLimitConfig;

        // Check if we're in a cooldown period after rate limit
        if (state.isRateLimited && now < state.rateLimitResetTime) {
            const waitTime = state.rateLimitResetTime - now;
            return {
                canProceed: false,
                waitTime,
                reason: `Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
            };
        } else if (state.isRateLimited && now >= state.rateLimitResetTime) {
            // Reset rate limit state
            state.isRateLimited = false;
            state.rateLimitResetTime = 0;
        }

        // Check minimum interval between requests
        const timeSinceLastRequest = now - state.lastRequestTime;
        if (timeSinceLastRequest < config.minRequestInterval) {
            const waitTime = config.minRequestInterval - timeSinceLastRequest;
            return {
                canProceed: false,
                waitTime,
                reason: `Please wait ${Math.ceil(waitTime / 1000)} seconds between requests.`
            };
        }

        // Clean old timestamps (older than 1 minute)
        state.requestTimestamps = state.requestTimestamps.filter(
            ts => now - ts < 60000
        );

        // Check requests per minute limit
        if (state.requestTimestamps.length >= config.maxRequestsPerMinute) {
            const oldestRequest = state.requestTimestamps[0];
            const waitTime = 60000 - (now - oldestRequest);
            return {
                canProceed: false,
                waitTime,
                reason: `Rate limit: ${config.maxRequestsPerMinute} requests per minute. Wait ${Math.ceil(waitTime / 1000)} seconds.`
            };
        }

        return { canProceed: true, waitTime: 0, reason: '' };
    }

    /**
     * Record a request for rate limiting purposes
     */
    recordRequest() {
        const now = Date.now();
        this.rateLimitState.requestTimestamps.push(now);
        this.rateLimitState.lastRequestTime = now;
    }

    /**
     * Handle rate limit response from server
     * @param {Response} response - The fetch response
     */
    handleRateLimitResponse(response) {
        const state = this.rateLimitState;
        const config = this.rateLimitConfig;

        state.isRateLimited = true;

        // Try to get retry-after header
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
            const retrySeconds = parseInt(retryAfter, 10);
            if (!isNaN(retrySeconds)) {
                state.rateLimitResetTime = Date.now() + (retrySeconds * 1000);
                console.log(`⏳ Rate limited. Retry after ${retrySeconds} seconds.`);
                return;
            }
        }

        // Default: wait 60 seconds
        state.rateLimitResetTime = Date.now() + 60000;
        console.log('⏳ Rate limited. Waiting 60 seconds before retry.');
    }

    /**
     * Calculate exponential backoff delay
     * @param {number} retryCount - Current retry attempt (0-indexed)
     * @returns {number} Delay in milliseconds
     */
    calculateBackoffDelay(retryCount) {
        const config = this.rateLimitConfig;
        // Exponential backoff: 2s, 4s, 8s, 16s... capped at maxRetryDelay
        const delay = Math.min(
            config.baseRetryDelay * Math.pow(2, retryCount),
            config.maxRetryDelay
        );
        // Add jitter (±25%) to prevent thundering herd
        const jitter = delay * 0.25 * (Math.random() - 0.5);
        return Math.round(delay + jitter);
    }

    /**
     * Wait for a specified duration with optional progress callback
     * @param {number} ms - Milliseconds to wait
     * @param {Function} onProgress - Optional callback with remaining time
     */
    async wait(ms, onProgress = null) {
        const startTime = Date.now();
        const endTime = startTime + ms;

        return new Promise((resolve) => {
            const checkProgress = () => {
                const now = Date.now();
                const remaining = Math.max(0, endTime - now);

                if (onProgress) {
                    onProgress(remaining, ms);
                }

                if (remaining <= 0) {
                    resolve();
                } else {
                    setTimeout(checkProgress, Math.min(remaining, 1000));
                }
            };
            checkProgress();
        });
    }

    /**
     * Wait until rate limit allows a request
     * @param {Function} onWaiting - Callback when waiting
     * @returns {Promise<void>}
     */
    async waitForRateLimit(onWaiting = null) {
        let check = this.checkRateLimit();

        while (!check.canProceed) {
            console.log(`⏳ Rate limit: ${check.reason}`);
            if (onWaiting) {
                onWaiting(check.waitTime, check.reason);
            }
            await this.wait(check.waitTime);
            check = this.checkRateLimit();
        }
    }

    /**
     * Get current rate limit status for UI display
     */
    getRateLimitStatus() {
        const check = this.checkRateLimit();
        const state = this.rateLimitState;
        const config = this.rateLimitConfig;

        return {
            canMakeRequest: check.canProceed,
            waitTime: check.waitTime,
            reason: check.reason,
            requestsInLastMinute: state.requestTimestamps.length,
            maxRequestsPerMinute: config.maxRequestsPerMinute,
            isRateLimited: state.isRateLimited,
            consecutiveErrors: state.consecutiveErrors
        };
    }

    async createChatSession() {
        try {
            const payload = {
                data: {
                    type: 'chats',
                    attributes: {}
                }
            };

            // Add agent ID if configured
            if (this.agentId) {
                payload.data.attributes.agentId = this.agentId;
            }

            console.log('🔍 Creating TD LLM chat session via proxy:', {
                proxyUrl: this.proxyUrl,
                agentId: this.agentId || '(server default)'
            });

            const response = await fetch(`${this.proxyUrl}/api/chats`, {
                method: 'POST',
                headers: this.buildHeaders(false),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Chat session creation failed:', response.status, errorText);
                throw new Error(`Failed to create chat session: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            this.currentChatId = result.data.id;
            console.log('✅ Chat session created:', this.currentChatId);

            return this.currentChatId;
        } catch (error) {
            console.error('Failed to create chat session:', error);
            throw error;
        }
    }

    async sendMessage(userMessage, conversationHistory = [], onChunk = null, signal = null, onRetry = null) {
        // Check connection first
        if (this.connectionStatus !== 'connected') {
            const status = await this.checkConnection();
            if (!status.connected) {
                throw new Error(`Proxy server not available: ${status.message}. Please start the proxy server.`);
            }
        }

        // Wait for rate limit if needed
        await this.waitForRateLimit((waitTime, reason) => {
            console.log(`⏳ Waiting for rate limit: ${reason}`);
            if (onRetry) {
                onRetry({ type: 'rateLimit', waitTime, reason, attempt: 0 });
            }
        });

        // Create chat session if needed
        if (!this.currentChatId) {
            await this.createChatSession();
        }

        this.currentAbortController = new AbortController();

        const config = this.rateLimitConfig;
        let lastError = null;

        // Retry loop with exponential backoff
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                // Record this request for rate limiting
                this.recordRequest();

                const payload = {
                    input: userMessage
                };

                console.log(`📨 Sending message via TD LLM API (attempt ${attempt + 1}/${config.maxRetries + 1}):`, userMessage.substring(0, 100) + '...');

                const response = await fetch(`${this.proxyUrl}/api/chats/${this.currentChatId}/continue`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream'
                    },
                    body: JSON.stringify(payload),
                    signal: signal || this.currentAbortController.signal
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ API request failed:', response.status, errorText);

                    // If chat session expired, try to create a new one
                    if (response.status === 404 || response.status === 410) {
                        console.log('🔄 Chat session expired, creating new session...');
                        this.currentChatId = null;
                        return await this.sendMessage(userMessage, conversationHistory, onChunk, signal, onRetry);
                    }

                    // Handle rate limit response (429)
                    if (response.status === 429) {
                        this.handleRateLimitResponse(response);
                        this.rateLimitState.consecutiveErrors++;

                        if (attempt < config.maxRetries) {
                            const waitTime = this.rateLimitState.rateLimitResetTime - Date.now();
                            console.log(`⏳ Rate limited (429). Waiting ${Math.ceil(waitTime / 1000)}s before retry...`);

                            if (onRetry) {
                                onRetry({
                                    type: 'rateLimit',
                                    attempt: attempt + 1,
                                    maxRetries: config.maxRetries,
                                    waitTime,
                                    reason: 'Server rate limit exceeded'
                                });
                            }

                            await this.wait(waitTime);
                            continue; // Retry
                        }
                    }

                    // Handle server errors (500, 502, 503) with retry
                    if ([500, 502, 503].includes(response.status) && attempt < config.maxRetries) {
                        const backoffDelay = this.calculateBackoffDelay(attempt);
                        console.log(`⏳ Server error (${response.status}). Retrying in ${Math.ceil(backoffDelay / 1000)}s...`);
                        this.rateLimitState.consecutiveErrors++;

                        if (onRetry) {
                            onRetry({
                                type: 'serverError',
                                attempt: attempt + 1,
                                maxRetries: config.maxRetries,
                                waitTime: backoffDelay,
                                reason: `Server error (${response.status})`
                            });
                        }

                        await this.wait(backoffDelay);
                        continue; // Retry
                    }

                    throw new Error(`API request failed: ${response.status} - ${errorText}`);
                }

                // Success! Reset consecutive errors
                this.rateLimitState.consecutiveErrors = 0;

                return await this.handleStreamingResponse(response, onChunk);

            } catch (error) {
                lastError = error;

                if (error.name === 'AbortError') {
                    console.log('Request was aborted');
                    throw error;
                }

                // Network errors - retry with backoff
                if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
                    this.rateLimitState.consecutiveErrors++;

                    if (attempt < config.maxRetries) {
                        const backoffDelay = this.calculateBackoffDelay(attempt);
                        console.log(`⏳ Network error. Retrying in ${Math.ceil(backoffDelay / 1000)}s...`);

                        if (onRetry) {
                            onRetry({
                                type: 'networkError',
                                attempt: attempt + 1,
                                maxRetries: config.maxRetries,
                                waitTime: backoffDelay,
                                reason: 'Network connection error'
                            });
                        }

                        await this.wait(backoffDelay);
                        continue; // Retry
                    }
                }

                console.error('TD LLM API Error:', error);
                throw error;
            }
        }

        // All retries exhausted
        throw lastError || new Error('All retry attempts failed');
    }

    async handleStreamingResponse(response, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete lines
                while (buffer.includes('\n')) {
                    const lineEnd = buffer.indexOf('\n');
                    const line = buffer.slice(0, lineEnd).trim();
                    buffer = buffer.slice(lineEnd + 1);

                    if (line.startsWith('data:')) {
                        const eventData = line.slice(5).trim();

                        if (eventData && eventData !== '[DONE]') {
                            try {
                                const parsed = JSON.parse(eventData);

                                // Handle content chunks
                                if (parsed.content) {
                                    fullText += parsed.content;
                                    if (onChunk) {
                                        onChunk(parsed.content, fullText);
                                    }
                                }

                                // Handle text content (alternative format)
                                if (parsed.text) {
                                    fullText += parsed.text;
                                    if (onChunk) {
                                        onChunk(parsed.text, fullText);
                                    }
                                }

                                // Handle errors in stream
                                if (parsed.error) {
                                    throw new Error(parsed.error);
                                }
                            } catch (e) {
                                // Ignore JSON parse errors for incomplete chunks
                                if (e.message && !e.message.includes('JSON')) {
                                    throw e;
                                }
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        console.log('✅ Response complete:', fullText.length, 'chars');

        // Track API call event
        if (window.UsageTracker) {
            // Estimate tokens: ~4 chars per token
            const estimatedTokens = Math.ceil(fullText.length / 4);
            window.UsageTracker.trackEvent('api_call', {
                model: this.model,
                responseLength: fullText.length,
                tokens: estimatedTokens
            });
        }

        return fullText;
    }

    abortCurrentRequest() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    }

    resetChatSession() {
        this.currentChatId = null;
        this.abortCurrentRequest();
    }

    // ========================================
    // High-level generation methods
    // ========================================

    async generateKnowledgeBases(agentDescription, domain) {
        const prompt = `Based on this agent description:
"${agentDescription}"

Domain: ${domain}

Generate 4-5 specific knowledge base topics that would be essential for this agent. For each knowledge base, provide:
1. A clear, concise name (3-5 words)
2. A brief description (1-2 sentences)
3. Sample content outline (3-5 bullet points)

Format your response as a JSON array of objects with keys: name, description, contentOutline (array of strings).
Only output the JSON array, no other text.`;

        try {
            this.resetChatSession();
            const response = await this.sendMessage(prompt);

            // Extract JSON from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Could not parse knowledge base suggestions');
        } catch (error) {
            console.error('Error generating knowledge bases:', error);
            return this.getFallbackKnowledgeBases(domain);
        }
    }

    getFallbackKnowledgeBases(domain) {
        const fallbacks = {
            marketing: [
                {
                    name: "Campaign Strategy Guide",
                    description: "Frameworks and methodologies for planning effective marketing campaigns",
                    contentOutline: ["Campaign objectives framework", "Audience targeting strategies", "Channel selection criteria", "Budget allocation models", "KPI definition guidelines"]
                },
                {
                    name: "Platform Best Practices",
                    description: "Platform-specific guidance for Meta, Google, TikTok, and other advertising platforms",
                    contentOutline: ["Platform feature comparisons", "Ad format specifications", "Targeting capabilities", "Bidding strategy recommendations"]
                },
                {
                    name: "Performance Analytics",
                    description: "Metrics, measurement, and optimization techniques for campaign performance",
                    contentOutline: ["Key performance indicators", "Attribution modeling", "A/B testing frameworks", "Optimization tactics"]
                }
            ],
            hr: [
                {
                    name: "HR Policies & Procedures",
                    description: "Company policies, procedures, and employee guidelines",
                    contentOutline: ["Employee handbook contents", "Leave and PTO policies", "Performance review process", "Code of conduct"]
                },
                {
                    name: "Benefits & Compensation",
                    description: "Employee benefits, insurance, and compensation information",
                    contentOutline: ["Health insurance options", "Retirement plans", "Equity programs", "Wellness benefits"]
                }
            ],
            support: [
                {
                    name: "Product Documentation",
                    description: "Comprehensive product guides and feature documentation",
                    contentOutline: ["Feature overviews", "Getting started guides", "Integration documentation", "API references"]
                },
                {
                    name: "Troubleshooting Guide",
                    description: "Common issues, diagnostic steps, and solutions",
                    contentOutline: ["Frequent error messages", "Diagnostic procedures", "Step-by-step solutions", "Escalation paths"]
                }
            ]
        };

        return fallbacks[domain] || fallbacks.marketing;
    }

    async generateSystemPrompt(config) {
        const prompt = `Create a detailed system prompt for an AI agent with these specifications:

Domain: ${config.domain}
Description: ${config.description}
Tone: ${config.tone || 'professional'}
Target Audience: ${config.audience || 'general users'}

Write a comprehensive system prompt (200-400 words) that clearly defines:
1. The agent's role and expertise
2. How it should interact with users
3. The tone and communication style
4. Key capabilities and limitations
5. Guidelines for providing helpful responses

Output only the system prompt text, no additional formatting or explanation.`;

        try {
            this.resetChatSession();
            return await this.sendMessage(prompt);
        } catch (error) {
            console.error('Error generating system prompt:', error);
            return `You are an expert ${config.domain} assistant. Your role is to help users with ${config.description}.

Communicate in a ${config.tone || 'professional'} manner, providing clear, actionable guidance.

Always be helpful, accurate, and focused on addressing the user's specific needs.`;
        }
    }

    async generateFullAgent(config, onProgress = null) {
        const updateProgress = (step, message) => {
            if (onProgress) onProgress(step, message);
        };

        updateProgress(1, 'Generating knowledge bases...');

        const knowledgeBases = await this.generateKnowledgeBases(
            config.description,
            config.domain || 'general'
        );

        updateProgress(2, 'Creating system prompt...');

        const systemPrompt = await this.generateSystemPrompt(config);

        updateProgress(3, 'Finalizing configuration...');

        return {
            knowledgeBases,
            systemPrompt,
            projectName: config.projectName || `${config.domain || 'Custom'} Agent Project`,
            projectDescription: config.description,
            agentName: config.agentName || `${config.domain || 'Custom'} Assistant`,
            model: this.model,
            temperature: 0.5
        };
    }
}

// Create and export singleton instance
const tdLlmAPI = new TDLLMAPI();

// For backward compatibility with wizard-ai.js that uses claudeAPI
const claudeAPI = tdLlmAPI;

console.log('📦 TD LLM API module loaded');
