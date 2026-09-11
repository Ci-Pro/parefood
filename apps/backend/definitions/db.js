// ==========================================
// PareFood Backend — Database Connection
// ==========================================

require('querybuilderpg').init('default', CONF.database, 20, function(err, cmd) {
    console.log('Database command failed:', err);
});

// Register event for database ready
ON('ready', function() {
    console.log('[DB] Supabase PostgreSQL connected');
});