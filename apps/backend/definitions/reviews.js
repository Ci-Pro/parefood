// ==========================================
// PareFood Backend — Review Service
// Rating aggregates are recomputed from the
// reviews table (no drift when reviews are
// removed or edited).
// ==========================================

FUNC.reviews = {};

// Recompute a merchant's rating from its reviews.
FUNC.reviews.updateMerchantRating = function(merchantId, cb) {
    var done = cb || function() {};

    DB().query("SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE merchant_id = '" + merchantId + "' AND is_removed = false").callback(function(err, rows) {
        if (err) return done(err);

        var row = (rows && rows[0]) || { avg_rating: 0, review_count: 0 };
        var rating = Math.round(Number(row.avg_rating || 0) * 10) / 10;

        DB().update('merchants', {
            rating: rating,
            rating_count: Number(row.review_count || 0),
            updated_at: new Date()
        }).where('id', merchantId).callback(function(err2) {
            done(err2);
        });
    });
};