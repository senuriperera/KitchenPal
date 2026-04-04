const db = require('../config/database');

class AnalyticsController {
    // Helper function to calculate time ago
    static timeAgo(date) {
        const mins = Math.floor((Date.now() - new Date(date)) / 60000);
        if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    // Helper function to get date range
    static getDateRange(rangeType) {
        const now = new Date();
        const daysMap = {
            'last_30_days': 30,
            'last_90_days': 90,
            'last_6_months': 180
        };
        const days = daysMap[rangeType] || 30;
        const dateFrom = new Date(now);
        dateFrom.setDate(dateFrom.getDate() - days);
        return dateFrom;
    }

    // Endpoint 1: GET /api/analytics/dashboard-stats
    static async getDashboardStats(req, res) {
        try {
            const userRole = req.user.role;
            const userBranchId = req.user.branch_id;
            const queryBranchId = req.query.branch_id;

            // Determine branch filter - case insensitive role check
            let branchFilter = '';
            let branchParams = [];
            
            if (userRole.toLowerCase() === 'admin' && queryBranchId) {
                // Admin with specific branch filter
                branchFilter = 'AND b.branch_id = $1';
                branchParams = [queryBranchId];
            } else if (userRole.toLowerCase() !== 'admin') {
                // Staff/manager sees only their branch
                branchFilter = 'AND b.branch_id = $1';
                branchParams = [userBranchId];
            }
            // If admin without branch_id, no filter (sees all branches)

            // Get current month boundaries
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

            // Helper to build param index
            const getParamIndex = (offset) => {
                return branchParams.length + offset;
            };

            // Run all queries in parallel
            const [
                nearExpiryResult,
                wastedThisMonthResult,
                wastedLastMonthResult,
                savedThisMonthResult,
                savedLastMonthResult,
                activeDiscountsResult,
                profitThisMonthResult
            ] = await Promise.all([
                // 1. Items near expiry (within 3 days)
                db.query(`
                    SELECT COUNT(DISTINCT ib.batch_id) as count
                    FROM ingredient_batches ib
                    JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
                    JOIN branches b ON si.branch_id = b.branch_id
                    WHERE ib.expiry_date <= CURRENT_DATE + INTERVAL '3 days'
                    AND ib.expiry_date >= CURRENT_DATE
                    AND ib.is_depleted = false
                    ${branchFilter}
                `, branchParams),

                // 2. Food wasted this month (in grams, will convert to kg)
                db.query(`
                    SELECT COALESCE(SUM(wl.quantity_wasted), 0) as total_wasted
                    FROM waste_logs wl
                    JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
                    JOIN branches b ON si.branch_id = b.branch_id
                    WHERE wl.logged_at >= $${getParamIndex(1)}
                    ${branchFilter}
                `, [...branchParams, currentMonthStart]),

                // 3. Food wasted last month
                db.query(`
                    SELECT COALESCE(SUM(wl.quantity_wasted), 0) as total_wasted
                    FROM waste_logs wl
                    JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
                    JOIN branches b ON si.branch_id = b.branch_id
                    WHERE wl.logged_at >= $${getParamIndex(1)}
                    AND wl.logged_at <= $${getParamIndex(2)}
                    ${branchFilter}
                `, [...branchParams, lastMonthStart, lastMonthEnd]),

                // 4. Food saved this month (from sales with generated recipes)
                db.query(`
                    SELECT COALESCE(SUM(sd.quantity_deducted), 0) as total_saved
                    FROM sale_deductions sd
                    JOIN sales s ON sd.sale_id = s.sale_id
                    JOIN ingredient_batches ib ON sd.batch_id = ib.batch_id
                    JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
                    JOIN branches b ON si.branch_id = b.branch_id
                    WHERE s.generated_id IS NOT NULL
                    AND s.sold_at >= $${getParamIndex(1)}
                    ${branchFilter}
                `, [...branchParams, currentMonthStart]),

                // 5. Food saved last month
                db.query(`
                    SELECT COALESCE(SUM(sd.quantity_deducted), 0) as total_saved
                    FROM sale_deductions sd
                    JOIN sales s ON sd.sale_id = s.sale_id
                    JOIN ingredient_batches ib ON sd.batch_id = ib.batch_id
                    JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
                    JOIN branches b ON si.branch_id = b.branch_id
                    WHERE s.generated_id IS NOT NULL
                    AND s.sold_at >= $${getParamIndex(1)}
                    AND s.sold_at <= $${getParamIndex(2)}
                    ${branchFilter}
                `, [...branchParams, lastMonthStart, lastMonthEnd]),

                // 6. Active discounts (approved generated recipes)
                db.query(`
                    SELECT COUNT(*) as count
                    FROM generated_recipes gr
                    JOIN branches b ON gr.branch_id = b.branch_id
                    WHERE gr.status = 'approved'
                    ${branchFilter}
                `, branchParams),

                // 7. Profit from discounts this month
                db.query(`
                    SELECT COALESCE(SUM(s.total_revenue), 0) as total_profit
                    FROM sales s
                    JOIN generated_recipes gr ON s.generated_id = gr.generated_id
                    JOIN branches b ON gr.branch_id = b.branch_id
                    WHERE s.sold_at >= $${getParamIndex(1)}
                    ${branchFilter}
                `, [...branchParams, currentMonthStart])
            ]);

            // Extract values and convert to kg
            const nearExpiry = parseInt(nearExpiryResult.rows[0].count);
            const wastedThisMonth = parseFloat(wastedThisMonthResult.rows[0].total_wasted) / 1000; // Convert to kg
            const wastedLastMonth = parseFloat(wastedLastMonthResult.rows[0].total_wasted) / 1000;
            const savedThisMonth = parseFloat(savedThisMonthResult.rows[0].total_saved) / 1000;
            const savedLastMonth = parseFloat(savedLastMonthResult.rows[0].total_saved) / 1000;
            const activeDiscounts = parseInt(activeDiscountsResult.rows[0].count);
            const profitThisMonth = parseFloat(profitThisMonthResult.rows[0].total_profit);

            // Calculate percentage changes
            const wastedChange = wastedLastMonth > 0 
                ? parseFloat((((wastedThisMonth - wastedLastMonth) / wastedLastMonth) * 100).toFixed(1))
                : 0;
            
            const savedChange = savedLastMonth > 0
                ? parseFloat((((savedThisMonth - savedLastMonth) / savedLastMonth) * 100).toFixed(1))
                : 0;

            res.json({
                nearExpiry,
                foodWasted: {
                    current: parseFloat(wastedThisMonth.toFixed(2)),
                    change: wastedChange
                },
                foodSaved: {
                    current: parseFloat(savedThisMonth.toFixed(2)),
                    change: savedChange
                },
                activeDiscounts,
                profitFromDiscounts: parseFloat(profitThisMonth.toFixed(2))
            });
        } catch (error) {
            console.error('Dashboard stats error:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
        }
    }

    // Endpoint 2: GET /api/analytics/monthly-summary
    static async getMonthlySummary(req, res) {
        try {
            const userRole = req.user.role;
            const userBranchId = req.user.branch_id;
            const queryBranchId = req.query.branch_id;
            const months = parseInt(req.query.months) || 6;

            // Determine branch filter - case insensitive role check
            let branchFilter = '';
            let branchParams = [];
            
            if (userRole.toLowerCase() === 'admin' && queryBranchId) {
                // Admin with specific branch filter
                branchFilter = 'AND b.branch_id = $1';
                branchParams = [queryBranchId];
            } else if (userRole.toLowerCase() !== 'admin') {
                // Staff/manager sees only their branch
                branchFilter = 'AND b.branch_id = $1';
                branchParams = [userBranchId];
            }
            // If admin without branch_id, no filter (sees all branches)

            // Calculate date range
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

            // Helper to build param index
            const getParamIndex = (offset) => {
                return branchParams.length + offset;
            };

            // Run queries in parallel
            const [wastedResult, savedResult] = await Promise.all([
                // Monthly waste
                db.query(`
                    SELECT 
                        DATE_TRUNC('month', wl.logged_at) as month,
                        COALESCE(SUM(wl.quantity_wasted), 0) as total_wasted
                    FROM waste_logs wl
                    JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
                    JOIN branches b ON si.branch_id = b.branch_id
                    WHERE wl.logged_at >= $${getParamIndex(1)}
                    ${branchFilter}
                    GROUP BY DATE_TRUNC('month', wl.logged_at)
                    ORDER BY month
                `, [...branchParams, startDate]),

                // Monthly saved
                db.query(`
                    SELECT 
                        DATE_TRUNC('month', s.sold_at) as month,
                        COALESCE(SUM(sd.quantity_deducted), 0) as total_saved
                    FROM sale_deductions sd
                    JOIN sales s ON sd.sale_id = s.sale_id
                    JOIN ingredient_batches ib ON sd.batch_id = ib.batch_id
                    JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
                    JOIN branches b ON si.branch_id = b.branch_id
                    WHERE s.generated_id IS NOT NULL
                    AND s.sold_at >= $${getParamIndex(1)}
                    ${branchFilter}
                    GROUP BY DATE_TRUNC('month', s.sold_at)
                    ORDER BY month
                `, [...branchParams, startDate])
            ]);

            // Create a map for easy lookup
            const wastedMap = {};
            wastedResult.rows.forEach(row => {
                const monthKey = new Date(row.month).toISOString().substring(0, 7);
                wastedMap[monthKey] = parseFloat(row.total_wasted) / 1000; // Convert to kg
            });

            const savedMap = {};
            savedResult.rows.forEach(row => {
                const monthKey = new Date(row.month).toISOString().substring(0, 7);
                savedMap[monthKey] = parseFloat(row.total_saved) / 1000; // Convert to kg
            });

            // Generate continuous monthly data
            const monthlyData = [];
            let currentMonthWasted = 0;
            let currentMonthSaved = 0;

            for (let i = 0; i < months; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
                const monthKey = date.toISOString().substring(0, 7);
                const wasted = wastedMap[monthKey] || 0;
                const saved = savedMap[monthKey] || 0;

                monthlyData.push({
                    month: monthKey,
                    wasted: parseFloat(wasted.toFixed(2)),
                    saved: parseFloat(saved.toFixed(2))
                });

                // Track current month (last in array)
                if (i === months - 1) {
                    currentMonthWasted = wasted;
                    currentMonthSaved = saved;
                }
            }

            // Calculate saved percentage
            const totalCurrent = currentMonthWasted + currentMonthSaved;
            const savedPercentage = totalCurrent > 0 
                ? parseFloat(((currentMonthSaved / totalCurrent) * 100).toFixed(1))
                : 0;

            res.json({
                currentMonth: {
                    wasted: parseFloat(currentMonthWasted.toFixed(2)),
                    saved: parseFloat(currentMonthSaved.toFixed(2)),
                    savedPercentage
                },
                monthlyData
            });
        } catch (error) {
            console.error('Monthly summary error:', error);
            res.status(500).json({ error: 'Failed to fetch monthly summary' });
        }
    }

    // Endpoint 3: GET /api/analytics/top-wasted
    static async getTopWasted(req, res) {
        try {
            const userRole = req.user.role;
            const userBranchId = req.user.branch_id;
            const queryBranchId = req.query.branch_id;
            const dateRange = req.query.date_range || 'last_30_days';
            const limit = parseInt(req.query.limit) || 5;

            // Determine branch filter - case insensitive role check
            let branchFilter = '';
            let branchParams = [];
            
            if (userRole.toLowerCase() === 'admin' && queryBranchId) {
                // Admin with specific branch filter
                branchFilter = 'AND b.branch_id = $1';
                branchParams = [queryBranchId];
            } else if (userRole.toLowerCase() !== 'admin') {
                // Staff/manager sees only their branch
                branchFilter = 'AND b.branch_id = $1';
                branchParams = [userBranchId];
            }
            // If admin without branch_id, no filter (sees all branches)

            // Get date range
            const dateFrom = AnalyticsController.getDateRange(dateRange);
            const daysInRange = Math.floor((Date.now() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
            const previousDateFrom = new Date(dateFrom);
            previousDateFrom.setDate(previousDateFrom.getDate() - daysInRange);

            // Helper to build param index
            const getParamIndex = (offset) => {
                return branchParams.length + offset;
            };

            // Query top wasted ingredients
            const topWastedResult = await db.query(`
                SELECT 
                    si.ingredient_id,
                    si.name,
                    COALESCE(SUM(wl.quantity_wasted), 0) as total_wasted
                FROM waste_logs wl
                JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
                JOIN branches b ON si.branch_id = b.branch_id
                WHERE wl.logged_at >= $${getParamIndex(1)}
                ${branchFilter}
                GROUP BY si.ingredient_id, si.name
                ORDER BY total_wasted DESC
                LIMIT $${getParamIndex(2)}
            `, [...branchParams, dateFrom, limit]);

            // Calculate total waste for percentage
            const totalWasteResult = await db.query(`
                SELECT COALESCE(SUM(wl.quantity_wasted), 0) as total
                FROM waste_logs wl
                JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
                JOIN branches b ON si.branch_id = b.branch_id
                WHERE wl.logged_at >= $${getParamIndex(1)}
                ${branchFilter}
            `, [...branchParams, dateFrom]);

            // Get previous period total for comparison
            const previousWasteResult = await db.query(`
                SELECT COALESCE(SUM(wl.quantity_wasted), 0) as total
                FROM waste_logs wl
                JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
                JOIN branches b ON si.branch_id = b.branch_id
                WHERE wl.logged_at >= $${getParamIndex(1)}
                AND wl.logged_at < $${getParamIndex(2)}
                ${branchFilter}
            `, [...branchParams, previousDateFrom, dateFrom]);

            const totalWaste = parseFloat(totalWasteResult.rows[0].total) / 1000; // Convert to kg
            const previousWaste = parseFloat(previousWasteResult.rows[0].total) / 1000;

            // Calculate change percentage
            const changePercentage = previousWaste > 0
                ? parseFloat((((totalWaste - previousWaste) / previousWaste) * 100).toFixed(1))
                : 0;

            // Format top wasted items
            const topWasted = topWastedResult.rows.map(row => ({
                ingredient_id: row.ingredient_id,
                name: row.name,
                quantity_kg: parseFloat((parseFloat(row.total_wasted) / 1000).toFixed(2)),
                percentage: totalWaste > 0 
                    ? parseFloat(((parseFloat(row.total_wasted) / 1000 / totalWaste) * 100).toFixed(1))
                    : 0
            }));

            res.json({
                totalWaste: parseFloat(totalWaste.toFixed(2)),
                changePercentage,
                topWasted
            });
        } catch (error) {
            console.error('Top wasted error:', error);
            res.status(500).json({ error: 'Failed to fetch top wasted ingredients' });
        }
    }

    // Endpoint 4: GET /api/analytics/recent-activity
    static async getRecentActivity(req, res) {
        try {
            const userRole = req.user.role;
            const userBranchId = req.user.branch_id;
            const queryBranchId = req.query.branch_id;

            // Determine branch filter - case insensitive role check
            let branchFilter = '';
            let branchParams = [];
            
            if (userRole.toLowerCase() === 'admin' && queryBranchId) {
                // Admin with specific branch filter
                branchFilter = 'WHERE branch_id = $1';
                branchParams = [queryBranchId];
            } else if (userRole.toLowerCase() !== 'admin') {
                // Staff/manager sees only their branch
                branchFilter = 'WHERE branch_id = $1';
                branchParams = [userBranchId];
            }
            // If admin without branch_id, no filter (sees all branches)

            // Union query for all activity types
            const activityResult = await db.query(`
                (
                    SELECT 
                        'sale' as type,
                        s.sale_id as id,
                        CONCAT('Sale of ', r.name) as message,
                        u.name as actor,
                        s.sold_at as timestamp,
                        s.branch_id
                    FROM sales s
                    LEFT JOIN recipes r ON s.recipe_id = r.recipe_id
                    LEFT JOIN generated_recipes gr ON s.generated_id = gr.generated_id
                    LEFT JOIN users u ON COALESCE(gr.generated_by, s.sold_by) = u.user_id
                    WHERE s.sold_at >= NOW() - INTERVAL '7 days'
                )
                UNION ALL
                (
                    SELECT 
                        'approval' as type,
                        gr.generated_id as id,
                        CONCAT('Approved recipe: ', r.name) as message,
                        u.name as actor,
                        gr.reviewed_at as timestamp,
                        gr.branch_id
                    FROM generated_recipes gr
                    LEFT JOIN recipes r ON gr.recipe_id = r.recipe_id
                    LEFT JOIN users u ON gr.reviewed_by = u.user_id
                    WHERE gr.status = 'approved'
                    AND gr.reviewed_at >= NOW() - INTERVAL '7 days'
                )
                UNION ALL
                (
                    SELECT 
                        'expiry_alert' as type,
                        n.notification_id as id,
                        n.title as message,
                        u.name as actor,
                        n.created_at as timestamp,
                        n.branch_id
                    FROM notifications n
                    LEFT JOIN users u ON n.user_id = u.user_id
                    WHERE n.notification_type = 'expiry_alert'
                    AND n.created_at >= NOW() - INTERVAL '7 days'
                )
                ORDER BY timestamp DESC
                LIMIT 10
            `, branchParams);

            // Filter by branch if needed and format with time_ago
            let activities = activityResult.rows;
            
            if (branchFilter && branchParams.length > 0) {
                activities = activities.filter(a => a.branch_id === branchParams[0]);
            }

            activities = activities.slice(0, 10).map(activity => ({
                type: activity.type,
                id: activity.id,
                message: activity.message,
                actor: activity.actor || 'System',
                time_ago: AnalyticsController.timeAgo(activity.timestamp)
            }));

            res.json({ activities });
        } catch (error) {
            console.error('Recent activity error:', error);
            res.status(500).json({ error: 'Failed to fetch recent activity' });
        }
    }

    // Endpoint 5: GET /api/analytics/nearing-expiry-list
    static async getNearingExpiryList(req, res) {
        try {
            const userRole = req.user.role;
            const userBranchId = req.user.branch_id;
            const queryBranchId = req.query.branch_id;

            // Determine branch filter - case insensitive role check
            let branchFilter = '';
            let branchParams = [];
            
            if (userRole.toLowerCase() === 'admin' && queryBranchId) {
                // Admin with specific branch filter
                branchFilter = 'AND si.branch_id = $1';
                branchParams = [queryBranchId];
            } else if (userRole.toLowerCase() !== 'admin') {
                // Staff/manager sees only their branch
                branchFilter = 'AND si.branch_id = $1';
                branchParams = [userBranchId];
            }
            // If admin without branch_id, no filter (sees all branches)

            // Query nearing expiry items
            const expiryResult = await db.query(`
                SELECT 
                    si.ingredient_id,
                    si.name,
                    si.image_url,
                    ib.batch_id,
                    ib.remaining_base_quantity,
                    u.name as unit_name,
                    ib.expiry_date,
                    (ib.expiry_date - CURRENT_DATE) as days_until_expiry
                FROM ingredient_batches ib
                JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
                JOIN units u ON si.base_unit_id = u.unit_id
                WHERE (ib.expiry_date - CURRENT_DATE) <= 3
                AND (ib.expiry_date - CURRENT_DATE) >= 0
                AND ib.is_depleted = false
                ${branchFilter}
                ORDER BY ib.expiry_date ASC
                LIMIT 5
            `, branchParams);

            const nearingExpiry = expiryResult.rows.map(row => ({
                ingredient_id: row.ingredient_id,
                batch_id: row.batch_id,
                name: row.name,
                image_url: row.image_url,
                quantity_remaining: parseFloat(row.remaining_base_quantity),
                unit: row.unit_name,
                expiry_date: row.expiry_date,
                days_left: parseInt(row.days_until_expiry)
            }));

            res.json({ nearingExpiry });
        } catch (error) {
            console.error('Nearing expiry list error:', error);
            res.status(500).json({ error: 'Failed to fetch nearing expiry list' });
        }
    }
}

module.exports = AnalyticsController;
