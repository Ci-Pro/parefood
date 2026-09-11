// ==========================================
// PareFood Backend — Default Controller (Health & Root)
// ==========================================

exports.install = function() {
    // Health check endpoint
    ROUTE('GET  /health/   --> health');
    ROUTE('GET  /api/v1/health/   --> health');

    // Root endpoint
    ROUTE('GET  /   --> root');
};

function health() {
    var self = this;

    self.json({
        status: 'ok',
        service: 'parefood-backend',
        version: CONF.version,
        time: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage().heapUsed
    });
}

function root() {
    var self = this;

    self.json({
        name: 'PareFood API',
        version: CONF.version,
        description: 'Local Food Delivery Platform for Pare/Kediri Area',
        status: 'running',
        endpoints: {
            health: '/health/',
            api: '/api/v1/'
        }
    });
}