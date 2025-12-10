/**
 * Usage Tracker for Agent Builder Wizard
 * Tracks user interactions and stores them in localStorage
 * Data can be viewed in the usage dashboard
 */

const UsageTracker = {
    STORAGE_KEY: 'td_agent_builder_usage',
    MAX_EVENTS: 1000, // Keep last 1000 events to prevent localStorage overflow

    // Initialize tracker
    init() {
        if (!this.getData()) {
            this.resetData();
        }
        this.trackEvent('session_start', { userAgent: navigator.userAgent });
        console.log('📊 Usage Tracker initialized');
    },

    // Get all usage data
    getData() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to get usage data:', e);
            return null;
        }
    },

    // Save usage data
    saveData(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save usage data:', e);
        }
    },

    // Reset/initialize data structure
    resetData() {
        const initialData = {
            firstVisit: new Date().toISOString(),
            lastVisit: new Date().toISOString(),
            totalSessions: 0,
            events: [],
            stats: {
                agentsGenerated: 0,
                agentsImported: 0,
                agentsSaved: 0,
                agentsPublished: 0,
                agentsExported: 0,
                chatMessages: 0,
                apiCalls: 0,
                totalTokensUsed: 0,
                kbsCreated: 0,
                outputsCreated: 0,
                toolsAdded: 0
            },
            dailyStats: {},
            hourlyDistribution: Array(24).fill(0)
        };
        this.saveData(initialData);
        return initialData;
    },

    // Track an event
    trackEvent(eventType, details = {}) {
        const data = this.getData() || this.resetData();
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const hour = now.getHours();

        // Create event record
        const event = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            type: eventType,
            timestamp: now.toISOString(),
            details: details
        };

        // Add to events array (keep last MAX_EVENTS)
        data.events.unshift(event);
        if (data.events.length > this.MAX_EVENTS) {
            data.events = data.events.slice(0, this.MAX_EVENTS);
        }

        // Update last visit
        data.lastVisit = now.toISOString();

        // Update hourly distribution
        data.hourlyDistribution[hour]++;

        // Update daily stats
        if (!data.dailyStats[today]) {
            data.dailyStats[today] = {
                sessions: 0,
                events: 0,
                agentsGenerated: 0,
                chatMessages: 0,
                apiCalls: 0
            };
        }
        data.dailyStats[today].events++;

        // Update specific stats based on event type
        switch (eventType) {
            case 'session_start':
                data.totalSessions++;
                data.dailyStats[today].sessions++;
                break;
            case 'agent_generated':
                data.stats.agentsGenerated++;
                data.dailyStats[today].agentsGenerated++;
                break;
            case 'agent_imported':
                data.stats.agentsImported++;
                break;
            case 'agent_saved':
                data.stats.agentsSaved++;
                break;
            case 'agent_published':
                data.stats.agentsPublished++;
                break;
            case 'agent_exported':
                data.stats.agentsExported++;
                break;
            case 'chat_message':
                data.stats.chatMessages++;
                data.dailyStats[today].chatMessages++;
                break;
            case 'api_call':
                data.stats.apiCalls++;
                data.dailyStats[today].apiCalls++;
                if (details.tokens) {
                    data.stats.totalTokensUsed += details.tokens;
                }
                break;
            case 'kb_created':
                data.stats.kbsCreated++;
                break;
            case 'output_created':
                data.stats.outputsCreated++;
                break;
            case 'tool_added':
                data.stats.toolsAdded++;
                break;
        }

        this.saveData(data);

        // Also send to Vercel Analytics if available
        if (window.va) {
            window.va('event', { name: eventType, ...details });
        }

        return event;
    },

    // Get summary statistics
    getSummary() {
        const data = this.getData();
        if (!data) return null;

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const yesterday = new Date(now - 86400000).toISOString().split('T')[0];
        const weekAgo = new Date(now - 7 * 86400000).toISOString().split('T')[0];

        // Calculate daily averages
        const dailyDates = Object.keys(data.dailyStats).sort();
        const last7Days = dailyDates.filter(d => d >= weekAgo);

        const avgDailyEvents = last7Days.length > 0
            ? last7Days.reduce((sum, d) => sum + data.dailyStats[d].events, 0) / last7Days.length
            : 0;

        return {
            ...data.stats,
            totalSessions: data.totalSessions,
            totalEvents: data.events.length,
            firstVisit: data.firstVisit,
            lastVisit: data.lastVisit,
            todayStats: data.dailyStats[today] || { sessions: 0, events: 0 },
            yesterdayStats: data.dailyStats[yesterday] || { sessions: 0, events: 0 },
            avgDailyEvents: Math.round(avgDailyEvents),
            peakHour: data.hourlyDistribution.indexOf(Math.max(...data.hourlyDistribution)),
            hourlyDistribution: data.hourlyDistribution,
            dailyStats: data.dailyStats,
            recentEvents: data.events.slice(0, 50)
        };
    },

    // Get events by type
    getEventsByType(eventType, limit = 100) {
        const data = this.getData();
        if (!data) return [];
        return data.events.filter(e => e.type === eventType).slice(0, limit);
    },

    // Get events for a specific date range
    getEventsByDateRange(startDate, endDate) {
        const data = this.getData();
        if (!data) return [];
        return data.events.filter(e => {
            const eventDate = e.timestamp.split('T')[0];
            return eventDate >= startDate && eventDate <= endDate;
        });
    },

    // Clear all data
    clearData() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.resetData();
        console.log('📊 Usage data cleared');
    },

    // Export data as JSON
    exportData() {
        const data = this.getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agent-builder-usage-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.UsageTracker = UsageTracker;
    document.addEventListener('DOMContentLoaded', () => {
        UsageTracker.init();
    });
}
