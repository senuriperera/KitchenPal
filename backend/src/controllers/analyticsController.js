const db = require('../config/database');
const { convertToDisplay, buildFamilyTotals, convertFamilyTotals } = require('../utils/quantityConverter');

class AnalyticsController {
  static timeAgo(date) {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  static getDateRange(rangeType) {
    const now = new Date();
    const daysMap = {
      'last_7_days': 7,
      'last_30_days': 30,
      'last_90_days': 90,
      'last_6_months': 180
    };
    const days = daysMap[rangeType] || 30;
    const dateFrom = new Date(now);
    dateFrom.setDate(dateFrom.getDate() - days);
    return dateFrom;
  }

  static async getDashboardStats(req, res) {
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branch_id;
      const queryBranchId = req.query.branch_id;

      let branchFilter = '';
      let wasteFilter = '';
      let branchParams = [];

      if (userRole.toLowerCase() === 'admin') {
        if (queryBranchId) {
          branchFilter = 'AND si.branch_id = $1';
          wasteFilter = 'AND wl.branch_id = $1';
          branchParams = [queryBranchId];
        }
      } else {
        branchFilter = 'AND si.branch_id = $1';
        wasteFilter = 'AND wl.branch_id = $1';
        branchParams = [userBranchId];
      }

      const now = new Date();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const getParamIndex = (offset) => branchParams.length + offset;

      const [
        nearExpiryResult,
        wastedThisMonthResult,
        wastedLastMonthResult,
        savedThisMonthResult,
        savedLastMonthResult,
        activeDiscountsResult,
        profitThisMonthResult
      ] = await Promise.all([

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

        db.query(`
          SELECT
            u.unit_family,
            COALESCE(SUM(wl.quantity_wasted * u.to_base_factor), 0) AS total_wasted
          FROM waste_logs wl
          JOIN units u ON wl.unit_id = u.unit_id
          WHERE DATE_TRUNC('month', wl.logged_at) = DATE_TRUNC('month', NOW())
            ${wasteFilter}
          GROUP BY u.unit_family
        `, branchParams),

        db.query(`
          SELECT
            u.unit_family,
            COALESCE(SUM(wl.quantity_wasted * u.to_base_factor), 0) AS total_wasted
          FROM waste_logs wl
          JOIN units u ON wl.unit_id = u.unit_id
          WHERE DATE_TRUNC('month', wl.logged_at) = DATE_TRUNC('month', $${getParamIndex(1)}::timestamp)
            ${wasteFilter}
          GROUP BY u.unit_family
        `, [...branchParams, lastMonthStart]),

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
          JOIN generated_recipe_triggers grt ON s.generated_id = grt.generated_id AND si.ingredient_id = grt.ingredient_id
          WHERE s.generated_id IS NOT NULL
            AND DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', NOW())
            ${branchFilter}
          GROUP BY u.unit_family, u.base_unit_code
        `, branchParams),

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
          JOIN generated_recipe_triggers grt ON s.generated_id = grt.generated_id AND si.ingredient_id = grt.ingredient_id
          WHERE s.generated_id IS NOT NULL
            AND DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', $${getParamIndex(1)}::timestamp)
            ${branchFilter}
          GROUP BY u.unit_family, u.base_unit_code
        `, [...branchParams, lastMonthStart]),

        db.query(`
          SELECT COUNT(*) as count
          FROM generated_recipes gr
          WHERE gr.status = 'approved'
            ${branchFilter ? 'AND gr.branch_id = $1' : ''}
        `, branchParams),

        db.query(`
          SELECT COALESCE(SUM(s.total_revenue), 0) as total_revenue
          FROM sales s
          JOIN generated_recipes gr ON s.generated_id = gr.generated_id
          WHERE DATE_TRUNC('month', s.sold_at) = DATE_TRUNC('month', NOW())
            ${branchFilter ? 'AND gr.branch_id = $1' : ''}
        `, branchParams)
      ]);

      const nearExpiry = parseInt(nearExpiryResult.rows[0].count);

      const wastedThisMonthByFamily = buildFamilyTotals(wastedThisMonthResult.rows);
      const wastedLastMonthByFamily = buildFamilyTotals(wastedLastMonthResult.rows);
      const wastedThisDisplay = convertFamilyTotals(wastedThisMonthByFamily, true);

      const savedThisMonthByFamily = buildFamilyTotals(savedThisMonthResult.rows);
      const savedLastMonthByFamily = buildFamilyTotals(savedLastMonthResult.rows);
      const savedThisDisplay = convertFamilyTotals(savedThisMonthByFamily, true);

      const calculateChange = (current, previous) =>
        previous > 0
          ? parseFloat((((current - previous) / previous) * 100).toFixed(1))
          : 0;

      const wastedChangePercent = calculateChange(
        wastedThisMonthByFamily.weight + wastedThisMonthByFamily.volume + wastedThisMonthByFamily.count,
        wastedLastMonthByFamily.weight + wastedLastMonthByFamily.volume + wastedLastMonthByFamily.count
      );

      const savedChangePercent = calculateChange(
        savedThisMonthByFamily.weight + savedThisMonthByFamily.volume + savedThisMonthByFamily.count,
        savedLastMonthByFamily.weight + savedLastMonthByFamily.volume + savedLastMonthByFamily.count
      );

      const profitThisMonth = parseFloat(profitThisMonthResult.rows[0].total_revenue || 0);
      const activeDiscounts = parseInt(activeDiscountsResult.rows[0].count);

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
          changePercent: 0
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  }

  static async getMonthlySummary(req, res) {
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branch_id;
      const queryBranchId = req.query.branch_id;
      const months = parseInt(req.query.months) || 6;

      let branchFilter = '';
      let wasteFilter = '';
      let branchParams = [];

      if (userRole.toLowerCase() === 'admin') {
        if (queryBranchId) {
          branchFilter = 'AND si.branch_id = $1';
          wasteFilter = 'AND wl.branch_id = $1';
          branchParams = [queryBranchId];
        }
      } else {
        branchFilter = 'AND si.branch_id = $1';
        wasteFilter = 'AND wl.branch_id = $1';
        branchParams = [userBranchId];
      }

      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

      const getParamIndex = (offset) => branchParams.length + offset;

      const [wastedResult, savedResult] = await Promise.all([
        db.query(`
          SELECT
            DATE_TRUNC('month', wl.logged_at) as month,
            u.unit_family,
            COALESCE(SUM(wl.quantity_wasted * u.to_base_factor), 0) AS total_wasted
          FROM waste_logs wl
          JOIN units u ON wl.unit_id = u.unit_id
          WHERE wl.logged_at >= $${getParamIndex(1)}
            ${wasteFilter}
          GROUP BY DATE_TRUNC('month', wl.logged_at), u.unit_family
          ORDER BY month ASC
        `, [...branchParams, startDate]),

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
          JOIN generated_recipe_triggers grt ON s.generated_id = grt.generated_id AND si.ingredient_id = grt.ingredient_id
          WHERE s.generated_id IS NOT NULL
            AND s.sold_at >= $${getParamIndex(1)}
            ${branchFilter}
          GROUP BY DATE_TRUNC('month', s.sold_at), u.unit_family
          ORDER BY month ASC
        `, [...branchParams, startDate])
      ]);

      const wastedMap = {};
      wastedResult.rows.forEach(row => {
        const key = new Date(row.month).toISOString().substring(0, 7);
        if (!wastedMap[key]) wastedMap[key] = { weight: 0, volume: 0, count: 0 };
        wastedMap[key][row.unit_family] = parseFloat(row.total_wasted);
      });

      const savedMap = {};
      savedResult.rows.forEach(row => {
        const key = new Date(row.month).toISOString().substring(0, 7);
        if (!savedMap[key]) savedMap[key] = { weight: 0, volume: 0, count: 0 };
        savedMap[key][row.unit_family] = parseFloat(row.total_saved);
      });

      const monthlyData = [];
      let currentMonthWasted = { weight: 0, volume: 0, count: 0 };
      let currentMonthSaved = { weight: 0, volume: 0, count: 0 };

      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        const key = date.toISOString().substring(0, 7);

        const wasted = wastedMap[key] || { weight: 0, volume: 0, count: 0 };
        const saved = savedMap[key] || { weight: 0, volume: 0, count: 0 };

        monthlyData.push({
          month: key,
          wasted: convertFamilyTotals(wasted, true),
          saved: convertFamilyTotals(saved, true)
        });

        if (i === months - 1) {
          currentMonthWasted = wasted;
          currentMonthSaved = saved;
        }
      }

      const totalCurrentWasted = currentMonthWasted.weight + currentMonthWasted.volume + currentMonthWasted.count;
      const totalCurrentSaved = currentMonthSaved.weight + currentMonthSaved.volume + currentMonthSaved.count;
      const savedPercentage = totalCurrentWasted + totalCurrentSaved > 0
        ? Math.round((totalCurrentSaved / (totalCurrentWasted + totalCurrentSaved)) * 100)
        : 0;

      res.json({
        currentMonth: {
          wasted: convertFamilyTotals(currentMonthWasted, true),
          saved: convertFamilyTotals(currentMonthSaved, true),
          savedPercentage
        },
        monthlyData
      });
    } catch (error) {
      console.error('Monthly summary error:', error);
      res.status(500).json({ error: 'Failed to fetch monthly summary' });
    }
  }

  static async getTopWasted(req, res) {
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branch_id;
      const queryBranchId = req.query.branch_id;
      const dateRange = req.query.date_range || 'last_30_days';
      const limit = parseInt(req.query.limit) || 5;

      let branchFilter = '';
      let wasteFilter = '';
      let branchParams = [];

      if (userRole.toLowerCase() === 'admin') {
        if (queryBranchId) {
          branchFilter = 'AND si.branch_id = $1';
          wasteFilter = 'AND wl.branch_id = $1';
          branchParams = [queryBranchId];
        }
      } else {
        branchFilter = 'AND si.branch_id = $1';
        wasteFilter = 'AND wl.branch_id = $1';
        branchParams = [userBranchId];
      }

      const dateFrom = AnalyticsController.getDateRange(dateRange);
      const daysInRange = Math.floor((Date.now() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
      const previousDateFrom = new Date(dateFrom);
      previousDateFrom.setDate(previousDateFrom.getDate() - daysInRange);

      const getParamIndex = (offset) => branchParams.length + offset;

      const [topWastedResult, totalWasteResult, previousWasteResult] = await Promise.all([

        db.query(`
          SELECT ingredient_id, name, unit_family, total_wasted_base
          FROM (
            SELECT
              si.ingredient_id,
              si.name,
              u.unit_family,
              COALESCE(SUM(wl.quantity_wasted * u.to_base_factor), 0) AS total_wasted_base,
              ROW_NUMBER() OVER (
                PARTITION BY u.unit_family
                ORDER BY COALESCE(SUM(wl.quantity_wasted * u.to_base_factor), 0) DESC
              ) AS rn
            FROM waste_logs wl
            JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
            JOIN units u ON wl.unit_id = u.unit_id
            WHERE wl.logged_at >= $${getParamIndex(1)}
              ${wasteFilter}
            GROUP BY si.ingredient_id, si.name, u.unit_family
          ) ranked
          WHERE rn <= $${getParamIndex(2)}
          ORDER BY unit_family, total_wasted_base DESC
        `, [...branchParams, dateFrom, limit]),

        db.query(`
          SELECT
            u.unit_family,
            COALESCE(SUM(wl.quantity_wasted * u.to_base_factor), 0) as total
          FROM waste_logs wl
          JOIN units u ON wl.unit_id = u.unit_id
          WHERE wl.logged_at >= $${getParamIndex(1)}
            ${wasteFilter}
          GROUP BY u.unit_family
        `, [...branchParams, dateFrom]),

        db.query(`
          SELECT
            u.unit_family,
            COALESCE(SUM(wl.quantity_wasted * u.to_base_factor), 0) as total
          FROM waste_logs wl
          JOIN units u ON wl.unit_id = u.unit_id
          WHERE wl.logged_at >= $${getParamIndex(1)}
            AND wl.logged_at < $${getParamIndex(2)}
            ${wasteFilter}
          GROUP BY u.unit_family
        `, [...branchParams, previousDateFrom, dateFrom])
      ]);

      const totalWasteByFamily = { weight: 0, volume: 0, count: 0 };
      totalWasteResult.rows.forEach(row => {
        totalWasteByFamily[row.unit_family] = parseFloat(row.total);
      });

      const previousWasteByFamily = { weight: 0, volume: 0, count: 0 };
      previousWasteResult.rows.forEach(row => {
        previousWasteByFamily[row.unit_family] = parseFloat(row.total);
      });

      const totalCurrent = totalWasteByFamily.weight + totalWasteByFamily.volume + totalWasteByFamily.count;
      const totalPrevious = previousWasteByFamily.weight + previousWasteByFamily.volume + previousWasteByFamily.count;
      const changePercentage = totalPrevious > 0
        ? parseFloat((((totalCurrent - totalPrevious) / totalPrevious) * 100).toFixed(1))
        : 0;

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
        totalWaste: convertFamilyTotals(totalWasteByFamily, true),
        changePercentage,
        topWasted
      });
    } catch (error) {
      console.error('Top wasted error:', error);
      res.status(500).json({ error: 'Failed to fetch top wasted ingredients' });
    }
  }

  static async getRecentActivity(req, res) {
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branch_id;
      const queryBranchId = req.query.branch_id;

      let branchFilter = '';
      let branchParams = [];

      if (userRole.toLowerCase() === 'admin') {
        if (queryBranchId) {
          branchFilter = 'WHERE branch_id = $1';
          branchParams = [queryBranchId];
        }
      } else {
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
      `, []);

      let activities = activityResult.rows;

      if (branchFilter && branchParams.length > 0) {
        activities = activities.filter(a => String(a.branch_id) === String(branchParams[0]));
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

  static async getNearingExpiryList(req, res) {
    try {
      const userRole = req.user.role;
      const userBranchId = req.user.branch_id;
      const queryBranchId = req.query.branch_id;

      let branchFilter = '';
      let branchParams = [];

      if (userRole.toLowerCase() === 'admin') {
        if (queryBranchId) {
          branchFilter = 'AND si.branch_id = $1';
          branchParams = [queryBranchId];
        }
      } else {
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
        LEFT JOIN units u ON si.base_unit_id = u.unit_id
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
              ${branchFilter ? 'AND gr.branch_id = (SELECT branch_id FROM stock_ingredients WHERE ingredient_id = grt.ingredient_id LIMIT 1)' : ''}
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
