const db = require('../config/database');
const { convertToDisplay, buildFamilyTotals, convertFamilyTotals } = require('../utils/quantityConverter');

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
      
      if (userRole.toLowerCase() === 'admin') {
        // Admin: filter by specific branch if provided, otherwise see all branches
        if (queryBranchId) {
          branchFilter = 'AND si.branch_id = $1';
          branchParams = [queryBranchId];
        }
        // If no queryBranchId, branchFilter stays empty (sees all branches)
      } else {
        // Non-admin: always filter to their branch
        branchFilter = 'AND si.branch_id = $1';
        branchParams = [userBranchId];
      }

      // Get current month boundaries
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const getParamIndex = (offset) => branchParams.length + offset;

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
          WHERE ib.expiry_date <= CURRENT_DATE + INTERVAL '3 days'
          AND ib.expiry_date >= CURRENT_DATE
          AND ib.is_depleted = false
          AND si.deleted_at IS NULL
          AND ib.deleted_at IS NULL
          ${branchFilter}
        `, branchParams),

        // 2. Food wasted this month grouped by unit_family
        db.query(`
          SELECT 
            u.unit_family,
            u.base_unit_code,
            COALESCE(SUM(wl.quantity_wasted), 0) AS total_wasted
          FROM waste_logs wl
          JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
          JOIN units u ON si.base_unit_id = u.unit_id
          WHERE DATE_TRUNC('month', wl.logged_at) = DATE_TRUNC('month', NOW())
          ${branchFilter}
          GROUP BY u.unit_family, u.base_unit_code
        `, branchParams),

        // 3. Food wasted last month grouped by unit_family
        db.query(`
          SELECT 
            u.unit_family,
            u.base_unit_code,
            COALESCE(SUM(wl.quantity_wasted), 0) AS total_wasted
          FROM waste_logs wl
          JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
          JOIN units u ON si.base_unit_id = u.unit_id
          WHERE DATE_TRUNC('month', wl.logged_at) = DATE_TRUNC('month', $${getParamIndex(1)}::timestamp)
          ${branchFilter}
          GROUP BY u.unit_family, u.base_unit_code
        `, [...branchParams, lastMonthStart]),

        // 4. Food saved this month grouped by unit_family
        db.query(`
          SELECT 
            u.unit_family,
            u.base_unit_code,
            COALESCE(SUM(sd.quantity_deducted), 0) AS total_saved
          FROM sale_deductions sd
          JOIN ingredient_batches ib ON sd.batch_id = ib.batch_id
          JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
          JOIN units u ON si.base_unit_id = u.unit_id
          JOIN sales s ON sd.sale_id = s.sale_id
          WHERE s.generated_id IS NOT NULL
          AND DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', NOW())
          ${branchFilter}
          GROUP BY u.unit_family, u.base_unit_code
        `, branchParams),

        // 5. Food saved last month grouped by unit_family
        db.query(`
          SELECT 
            u.unit_family,
            u.base_unit_code,
            COALESCE(SUM(sd.quantity_deducted), 0) AS total_saved
          FROM sale_deductions sd
          JOIN ingredient_batches ib ON sd.batch_id = ib.batch_id
          JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
          JOIN units u ON si.base_unit_id = u.unit_id
          JOIN sales s ON sd.sale_id = s.sale_id
          WHERE s.generated_id IS NOT NULL
          AND DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', $${getParamIndex(1)}::timestamp)
          ${branchFilter}
          GROUP BY u.unit_family, u.base_unit_code
        `, [...branchParams, lastMonthStart]),

        // 6. Active discounts (approved generated recipes)
        db.query(`
          SELECT COUNT(*) as count
          FROM generated_recipes gr
          WHERE gr.status = 'approved'
          ${branchFilter ? 'AND gr.branch_id = $1' : ''}
        `, branchParams),

        // 7. Profit from discounts this month
        db.query(`
          SELECT COALESCE(SUM(s.total_revenue), 0) as total_revenue
          FROM sales s
          JOIN generated_recipes gr ON s.generated_id = gr.generated_id
          WHERE DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', NOW())
          ${branchFilter ? 'AND gr.branch_id = $1' : ''}
        `, branchParams)
      ]);

      // Process results
      const nearExpiry = parseInt(nearExpiryResult.rows[0].count);
      
      const wastedThisMonthByFamily = buildFamilyTotals(wastedThisMonthResult.rows);
      const wastedLastMonthByFamily = buildFamilyTotals(wastedLastMonthResult.rows);
      const wastedThisDisplay = convertFamilyTotals(wastedThisMonthByFamily);
      const wastedLastDisplay = convertFamilyTotals(wastedLastMonthByFamily);

      const savedThisMonthByFamily = buildFamilyTotals(savedThisMonthResult.rows);
      const savedLastMonthByFamily = buildFamilyTotals(savedLastMonthResult.rows);
      const savedThisDisplay = convertFamilyTotals(savedThisMonthByFamily);
      const savedLastDisplay = convertFamilyTotals(savedLastMonthByFamily);

      // Calculate percentage changes for each family
      const calculateChange = (current, previous) => {
        return previous > 0 
          ? parseFloat((((current - previous) / previous) * 100).toFixed(1))
          : 0;
      };

      const wastedChangePercent = calculateChange(
        wastedThisMonthByFamily.weight + wastedThisMonthByFamily.volume + wastedThisMonthByFamily.count,
        wastedLastMonthByFamily.weight + wastedLastMonthByFamily.volume + wastedLastMonthByFamily.count
      );

      const savedChangePercent = calculateChange(
        savedThisMonthByFamily.weight + savedThisMonthByFamily.volume + savedThisMonthByFamily.count,
        savedLastMonthByFamily.weight + savedLastMonthByFamily.volume + savedLastMonthByFamily.count
      );

      // Calculate saved percentage using monetary value
      const profitThisMonth = parseFloat(profitThisMonthResult.rows[0].total_revenue || 0);
      const activeDiscounts = parseInt(activeDiscountsResult.rows[0].count);

      // For saved percentage, use total quantities
      const totalSavedQty = savedThisMonthByFamily.weight + savedThisMonthByFamily.volume + savedThisMonthByFamily.count;
      const totalWastedQty = wastedThisMonthByFamily.weight + wastedThisMonthByFamily.volume + wastedThisMonthByFamily.count;
      const savedPercentage = totalSavedQty + totalWastedQty > 0
        ? Math.round((totalSavedQty / (totalSavedQty + totalWastedQty)) * 100)
        : 0;

      res.json({
        nearExpiry,
        foodWasted: {
          weight: wastedThisDisplay.weight,
          volume: wastedThisDisplay.volume,
          count: wastedThisDisplay.count,
          changePercent: wastedChangePercent
        },
        foodSaved: {
          weight: savedThisDisplay.weight,
          volume: savedThisDisplay.volume,
          count: savedThisDisplay.count,
          changePercent: savedChangePercent
        },
        savedPercentage,
        activeDiscounts,
        profitFromDiscounts: {
          current: parseFloat(profitThisMonth.toFixed(2)),
          changePercent: 0 // TODO: calculate from last month
        }
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

      let branchFilter = '';
      let branchParams = [];
      
      if (userRole.toLowerCase() === 'admin') {
        // Admin: filter by specific branch if provided, otherwise see all branches
        if (queryBranchId) {
          branchFilter = 'AND si.branch_id = $1';
          branchParams = [queryBranchId];
        }
        // If no queryBranchId, branchFilter stays empty (sees all branches)
      } else {
        // Non-admin: always filter to their branch
        branchFilter = 'AND si.branch_id = $1';
        branchParams = [userBranchId];
      }

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

      const getParamIndex = (offset) => branchParams.length + offset;

      const [wastedResult, savedResult] = await Promise.all([
        // Monthly waste grouped by month AND unit_family
        db.query(`
          SELECT 
            DATE_TRUNC('month', wl.logged_at) as month,
            u.unit_family,
            COALESCE(SUM(wl.quantity_wasted), 0) AS total_wasted
          FROM waste_logs wl
          JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
          JOIN units u ON si.base_unit_id = u.unit_id
          WHERE wl.logged_at >= $${getParamIndex(1)}
          ${branchFilter}
          GROUP BY DATE_TRUNC('month', wl.logged_at), u.unit_family
          ORDER BY month ASC
        `, [...branchParams, startDate]),

        // Monthly saved grouped by month AND unit_family
        db.query(`
          SELECT 
            DATE_TRUNC('month', s.sold_at) as month,
            u.unit_family,
            COALESCE(SUM(sd.quantity_deducted), 0) AS total_saved
          FROM sale_deductions sd
          JOIN ingredient_batches ib ON sd.batch_id = ib.batch_id
          JOIN stock_ingredients si ON ib.ingredient_id = si.ingredient_id
          JOIN units u ON si.base_unit_id = u.unit_id
          JOIN sales s ON sd.sale_id = s.sale_id
          WHERE s.generated_id IS NOT NULL
          AND s.sold_at >= $${getParamIndex(1)}
          ${branchFilter}
          GROUP BY DATE_TRUNC('month', s.sold_at), u.unit_family
          ORDER BY month ASC
        `, [...branchParams, startDate])
      ]);

      // Build maps for lookup
      const wastedMap = {};
      wastedResult.rows.forEach(row => {
        const monthKey = new Date(row.month).toISOString().substring(0, 7);
        if (!wastedMap[monthKey]) wastedMap[monthKey] = { weight: 0, volume: 0, count: 0 };
        wastedMap[monthKey][row.unit_family] = parseFloat(row.total_wasted);
      });

      const savedMap = {};
      savedResult.rows.forEach(row => {
        const monthKey = new Date(row.month).toISOString().substring(0, 7);
        if (!savedMap[monthKey]) savedMap[monthKey] = { weight: 0, volume: 0, count: 0 };
        savedMap[monthKey][row.unit_family] = parseFloat(row.total_saved);
      });

      // Generate continuous monthly data
      const monthlyData = [];
      let currentMonthWasted = { weight: 0, volume: 0, count: 0 };
      let currentMonthSaved = { weight: 0, volume: 0, count: 0 };

      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        const monthKey = date.toISOString().substring(0, 7);
        
        const wasted = wastedMap[monthKey] || { weight: 0, volume: 0, count: 0 };
        const saved = savedMap[monthKey] || { weight: 0, volume: 0, count: 0 };

        monthlyData.push({
          month: monthKey,
          wasted: convertFamilyTotals(wasted),
          saved: convertFamilyTotals(saved)
        });

        // Track current month (last in array)
        if (i === months - 1) {
          currentMonthWasted = wasted;
          currentMonthSaved = saved;
        }
      }

      // Calculate saved percentage
      const totalCurrentWasted = currentMonthWasted.weight + currentMonthWasted.volume + currentMonthWasted.count;
      const totalCurrentSaved = currentMonthSaved.weight + currentMonthSaved.volume + currentMonthSaved.count;
      const savedPercentage = totalCurrentWasted + totalCurrentSaved > 0
        ? Math.round((totalCurrentSaved / (totalCurrentWasted + totalCurrentSaved)) * 100)
        : 0;

      res.json({
        currentMonth: {
          wasted: convertFamilyTotals(currentMonthWasted),
          saved: convertFamilyTotals(currentMonthSaved),
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

      let branchFilter = '';
      let branchParams = [];
      
      if (userRole.toLowerCase() === 'admin') {
        // Admin: filter by specific branch if provided, otherwise see all branches
        if (queryBranchId) {
          branchFilter = 'AND si.branch_id = $1';
          branchParams = [queryBranchId];
        }
        // If no queryBranchId, branchFilter stays empty (sees all branches)
      } else {
        // Non-admin: always filter to their branch
        branchFilter = 'AND si.branch_id = $1';
        branchParams = [userBranchId];
      }

      const dateFrom = AnalyticsController.getDateRange(dateRange);
      const daysInRange = Math.floor((Date.now() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
      const previousDateFrom = new Date(dateFrom);
      previousDateFrom.setDate(previousDateFrom.getDate() - daysInRange);

      const getParamIndex = (offset) => branchParams.length + offset;

      const [topWastedResult, totalWasteResult, previousWasteResult] = await Promise.all([
        // Top wasted ingredients — top N per unit_family (weight/volume/count)
        db.query(`
          SELECT ingredient_id, name, unit_family, base_unit_code, total_wasted_base
          FROM (
            SELECT
              si.ingredient_id,
              si.name,
              u.unit_family,
              u.base_unit_code,
              COALESCE(SUM(wl.quantity_wasted), 0) AS total_wasted_base,
              ROW_NUMBER() OVER (
                PARTITION BY u.unit_family
                ORDER BY COALESCE(SUM(wl.quantity_wasted), 0) DESC
              ) AS rn
            FROM waste_logs wl
            JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
            JOIN units u ON si.base_unit_id = u.unit_id
            WHERE wl.logged_at >= $${getParamIndex(1)}
            ${branchFilter}
            GROUP BY si.ingredient_id, si.name, u.unit_family, u.base_unit_code
          ) ranked
          WHERE rn <= $${getParamIndex(2)}
          ORDER BY unit_family, total_wasted_base DESC
        `, [...branchParams, dateFrom, limit]),

        // Total waste for percentage
        db.query(`
          SELECT 
            u.unit_family,
            COALESCE(SUM(wl.quantity_wasted), 0) as total
          FROM waste_logs wl
          JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
          JOIN units u ON si.base_unit_id = u.unit_id
          WHERE wl.logged_at >= $${getParamIndex(1)}
          ${branchFilter}
          GROUP BY u.unit_family
        `, [...branchParams, dateFrom]),

        // Previous period total
        db.query(`
          SELECT 
            u.unit_family,
            COALESCE(SUM(wl.quantity_wasted), 0) as total
          FROM waste_logs wl
          JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
          JOIN units u ON si.base_unit_id = u.unit_id
          WHERE wl.logged_at >= $${getParamIndex(1)}
          AND wl.logged_at < $${getParamIndex(2)}
          ${branchFilter}
          GROUP BY u.unit_family
        `, [...branchParams, previousDateFrom, dateFrom])
      ]);

      // Build totals by family
      const totalWasteByFamily = { weight: 0, volume: 0, count: 0 };
      totalWasteResult.rows.forEach(row => {
        totalWasteByFamily[row.unit_family] = parseFloat(row.total);
      });

      const previousWasteByFamily = { weight: 0, volume: 0, count: 0 };
      previousWasteResult.rows.forEach(row => {
        previousWasteByFamily[row.unit_family] = parseFloat(row.total);
      });

      // Calculate change percentage
      const totalCurrent = totalWasteByFamily.weight + totalWasteByFamily.volume + totalWasteByFamily.count;
      const totalPrevious = previousWasteByFamily.weight + previousWasteByFamily.volume + previousWasteByFamily.count;
      const changePercentage = totalPrevious > 0
        ? parseFloat((((totalCurrent - totalPrevious) / totalPrevious) * 100).toFixed(1))
        : 0;

      // Format top wasted items
      const topWasted = topWastedResult.rows.map(row => {
        const familyTotal = totalWasteByFamily[row.unit_family];
        const percentage = familyTotal > 0
          ? parseFloat(((parseFloat(row.total_wasted_base) / familyTotal) * 100).toFixed(1))
          : 0;

        return {
          ingredient_id: row.ingredient_id,
          name: row.name,
          unit_family: row.unit_family,
          quantity: convertToDisplay(parseFloat(row.total_wasted_base), row.unit_family),
          percentage
        };
      });

      res.json({
        totalWaste: convertFamilyTotals(totalWasteByFamily),
        changePercentage,
        topWasted
      });
    } catch (error) {
      console.error('Top wasted error:', error);
      res.status(500).json({ error: 'Failed to fetch top wasted ingredients' });
    }
  }

  // Endpoint 4: GET /api/analytics/recent-activity (NO CHANGES)
  static async getRecentActivity(req, res) {
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branch_id;
      const queryBranchId = req.query.branch_id;

      let branchFilter = '';
      let branchParams = [];
      
      if (userRole.toLowerCase() === 'admin') {
        // Admin: filter by specific branch if provided, otherwise see all branches
        if (queryBranchId) {
          branchFilter = 'WHERE branch_id = $1';
          branchParams = [queryBranchId];
        } else {
          // If no queryBranchId, no WHERE clause (sees all branches)
          branchFilter = '';
        }
      } else {
        // Non-admin: always filter to their branch
        branchFilter = 'WHERE branch_id = $1';
        branchParams = [userBranchId];
      }

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

  // Endpoint 5: GET /api/analytics/nearing-expiry-list (NO CHANGES)
  static async getNearingExpiryList(req, res) {
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branch_id;
      const queryBranchId = req.query.branch_id;

      let branchFilter = '';
      let branchParams = [];
      
      if (userRole.toLowerCase() === 'admin') {
        // Admin: filter by specific branch if provided, otherwise see all branches
        if (queryBranchId) {
          branchFilter = 'AND si.branch_id = $1';
          branchParams = [queryBranchId];
        }
        // If no queryBranchId, branchFilter stays empty (sees all branches)
      } else {
        // Non-admin: always filter to their branch
        branchFilter = 'AND si.branch_id = $1';
        branchParams = [userBranchId];
      }

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
        AND si.deleted_at IS NULL
        AND ib.deleted_at IS NULL
        ${branchFilter}
        AND si.ingredient_id NOT IN (
          SELECT DISTINCT grt.ingredient_id
          FROM generated_recipe_triggers grt
          JOIN generated_recipes gr ON grt.generated_id = gr.generated_id
          WHERE gr.status IN ('pending', 'approved')
          ${branchFilter ? 'AND gr.branch_id = (SELECT branch_id FROM stock_ingredients WHERE ingredient_id = grt.ingredient_id)' : ''}
        )
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
