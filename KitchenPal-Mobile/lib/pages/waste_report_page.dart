import 'package:flutter/material.dart';
import 'dart:async';
import 'package:fl_chart/fl_chart.dart';
import '../services/analytics_service.dart';
import '../services/websocket_service.dart';
import '../models/monthly_summary.dart';
import '../models/top_wasted.dart';

class WasteReportPage extends StatefulWidget {
  const WasteReportPage({super.key});

  @override
  State<WasteReportPage> createState() => _WasteReportPageState();
}

class _WasteReportPageState extends State<WasteReportPage> {
  static const _green = Color(0xFF00C853);
  static const _wastedColor = Color(0xFFFF7043);

  String _selectedDateRange = 'last_30_days';
  String _selectedTrendFamily = 'weight';
  String _selectedTopFamily = 'weight';

  bool _isLoading = false;
  String? _errorMessage;
  MonthlySummary? _monthlySummary;
  TopWastedReport? _topWasted;

  late StreamSubscription<dynamic> _analyticsUpdatedSubscription;

  final List<Color> _pieColors = const [
    Color(0xFF10B981),
    Color(0xFFF97316),
    Color(0xFFFCD34D),
    Color(0xFFF87171),
    Color(0xFF60A5FA),
  ];

  @override
  void initState() {
    super.initState();
    _loadReport();
    _setupRealtimeUpdates();
  }

  void _setupRealtimeUpdates() {
    WebSocketService.instance.connect();
    _analyticsUpdatedSubscription = WebSocketService.instance.analyticsUpdated
        .listen((_) {
          print('[WasteReportPage] Analytics updated, refreshing report...');
          if (mounted) {
            _loadReport();
          }
        });
  }

  @override
  void dispose() {
    _analyticsUpdatedSubscription.cancel();
    super.dispose();
  }

  Future<void> _loadReport() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        AnalyticsService.getMonthlySummary(),
        AnalyticsService.getTopWasted(dateRange: _selectedDateRange),
      ]);

      if (!mounted) return;
      setState(() {
        _monthlySummary = results[0] as MonthlySummary;
        _topWasted = results[1] as TopWastedReport;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Failed to load report data. Please try again.';
        _isLoading = false;
      });
    }
  }

  Future<void> _onDateRangeChanged(String range) async {
    if (_selectedDateRange == range) return;
    setState(() {
      _selectedDateRange = range;
      _topWasted = null;
    });
    await _loadReport();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text(
          'Food Waste Report',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _isLoading ? null : _loadReport,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: _green))
            : _errorMessage != null
            ? _buildError()
            : _buildContent(),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 56, color: Colors.red.shade300),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.red.shade700, fontSize: 14),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loadReport,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _green,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    return RefreshIndicator(
      onRefresh: _loadReport,
      color: _green,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDateRangeSelector(),
            const SizedBox(height: 16),
            if (_topWasted != null) ...[
              _buildSummarySection(),
              const SizedBox(height: 20),
            ],
            if (_monthlySummary != null) ...[
              _buildMonthlyTrendCard(),
              const SizedBox(height: 20),
            ],
            if (_topWasted != null) ...[
              _buildTopWastedCard(),
              const SizedBox(height: 20),
            ],
            if (_monthlySummary != null) _buildCurrentMonthCard(),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  // ── Date Range Selector ──────────────────────────────────────────────────────

  Widget _buildDateRangeSelector() {
    const ranges = [
      ('last_7_days', '7 Days'),
      ('last_30_days', '30 Days'),
      ('last_90_days', '90 Days'),
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8),
        ],
      ),
      child: Row(
        children: ranges.map((entry) {
          final isSelected = _selectedDateRange == entry.$1;
          return Expanded(
            child: GestureDetector(
              onTap: () => _onDateRangeChanged(entry.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: BoxDecoration(
                  color: isSelected ? _green : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  entry.$2,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : Colors.black45,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  String get _dateRangeLabel {
    const labels = {
      'last_7_days': 'Last 7 Days',
      'last_30_days': 'Last 30 Days',
      'last_90_days': 'Last 90 Days',
    };
    return labels[_selectedDateRange] ?? 'Last 30 Days';
  }

  // ── Summary Section ──────────────────────────────────────────────────────────

  Widget _buildSummarySection() {
    final data = _topWasted!;
    final changePercent = data.changePercentage;
    final increased = changePercent > 0;
    final decreased = changePercent < 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Total Waste — $_dateRangeLabel',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
            ),
            if (changePercent != 0)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: increased ? Colors.red.shade50 : Colors.green.shade50,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: increased
                        ? Colors.red.shade100
                        : Colors.green.shade100,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      increased ? Icons.trending_up : Icons.trending_down,
                      size: 14,
                      color: increased
                          ? Colors.red.shade700
                          : Colors.green.shade700,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${increased ? '+' : ''}${changePercent.toStringAsFixed(1)}%',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: increased
                            ? Colors.red.shade700
                            : Colors.green.shade700,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        if (increased || decreased) ...[
          const SizedBox(height: 4),
          Text(
            increased
                ? 'Waste increased compared to previous period'
                : 'Waste decreased compared to previous period',
            style: TextStyle(
              fontSize: 11,
              color: increased ? Colors.red.shade400 : Colors.green.shade400,
            ),
          ),
        ],
        const SizedBox(height: 12),
        Row(
          children: [
            _buildStatCard(
              label: 'Weight',
              value: _displayOrZero(data.totalWaste.weight.display, '0 kg'),
              icon: Icons.scale_outlined,
              color: const Color(0xFF5C6BC0),
            ),
            const SizedBox(width: 8),
            _buildStatCard(
              label: 'Volume',
              value: _displayOrZero(data.totalWaste.volume.display, '0 L'),
              icon: Icons.water_drop_outlined,
              color: const Color(0xFF29B6F6),
            ),
            const SizedBox(width: 8),
            _buildStatCard(
              label: 'Count',
              value: _displayOrZero(data.totalWaste.count.display, '0 items'),
              icon: Icons.inventory_2_outlined,
              color: _wastedColor,
            ),
          ],
        ),
      ],
    );
  }

  String _displayOrZero(String display, String fallback) {
    return display.isNotEmpty ? display : fallback;
  }

  Widget _buildStatCard({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: Colors.black45),
            ),
          ],
        ),
      ),
    );
  }

  // ── Monthly Trend Chart ──────────────────────────────────────────────────────

  Widget _buildMonthlyTrendCard() {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Monthly Trend',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
              _buildFamilyTabs(
                const [
                  ('weight', 'Weight'),
                  ('volume', 'Volume'),
                  ('count', 'Count'),
                ],
                _selectedTrendFamily,
                (f) => setState(() => _selectedTrendFamily = f),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            'Wasted vs Saved (last 6 months)',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
          ),
          const SizedBox(height: 16),
          SizedBox(height: 190, child: _buildBarChart()),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildLegendItem(_wastedColor, 'Wasted'),
              const SizedBox(width: 20),
              _buildLegendItem(_green, 'Saved'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBarChart() {
    final months = _monthlySummary!.monthlyData;
    if (months.isEmpty) {
      return _noDataWidget();
    }

    final family = _selectedTrendFamily;
    double maxY = 0;
    for (final m in months) {
      final w = _familyValue(m.wasted, family);
      final s = _familyValue(m.saved, family);
      if (w > maxY) maxY = w;
      if (s > maxY) maxY = s;
    }

    if (maxY == 0) return _noDataWidget();

    final interval = (maxY * 1.25 / 4);
    maxY = maxY * 1.25;

    return BarChart(
      BarChartData(
        maxY: maxY,
        barGroups: List.generate(months.length, (i) {
          return BarChartGroupData(
            x: i,
            barsSpace: 4,
            barRods: [
              BarChartRodData(
                toY: _familyValue(months[i].wasted, family),
                color: _wastedColor,
                width: 10,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(4),
                ),
              ),
              BarChartRodData(
                toY: _familyValue(months[i].saved, family),
                color: _green,
                width: 10,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(4),
                ),
              ),
            ],
          );
        }),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 24,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= months.length)
                  return const SizedBox.shrink();
                final parts = months[idx].month.split('-');
                if (parts.length >= 2) {
                  final num = int.tryParse(parts[1]) ?? 1;
                  const abbr = [
                    '',
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ];
                  return Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      abbr[num],
                      style: const TextStyle(
                        fontSize: 10,
                        color: Colors.black45,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: interval > 0 ? interval : 1,
          getDrawingHorizontalLine: (_) =>
              FlLine(color: Colors.grey.shade100, strokeWidth: 1),
        ),
        borderData: FlBorderData(show: false),
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (group) => Colors.black87,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final m = months[groupIndex];
              final label = rodIndex == 0 ? 'Wasted' : 'Saved';
              final display = rodIndex == 0
                  ? _familyDisplay(m.wasted, family)
                  : _familyDisplay(m.saved, family);
              return BarTooltipItem(
                '$label\n$display',
                const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  double _familyValue(MonthlyFamilyTotals t, String family) {
    switch (family) {
      case 'weight':
        return t.weight.value;
      case 'volume':
        return t.volume.value;
      case 'count':
        return t.count.value;
      default:
        return 0;
    }
  }

  String _familyDisplay(MonthlyFamilyTotals t, String family) {
    switch (family) {
      case 'weight':
        return _displayOrZero(t.weight.display, '0 kg');
      case 'volume':
        return _displayOrZero(t.volume.display, '0 L');
      case 'count':
        return _displayOrZero(t.count.display, '0 items');
      default:
        return '0';
    }
  }

  // ── Top Wasted Items ─────────────────────────────────────────────────────────

  Widget _buildTopWastedCard() {
    final items = _topWasted!.topWasted
        .where((i) => i.unitFamily == _selectedTopFamily)
        .toList();

    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Top Wasted Items',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
              _buildFamilyTabs(
                const [
                  ('weight', 'Weight'),
                  ('volume', 'Volume'),
                  ('count', 'Count'),
                ],
                _selectedTopFamily,
                (f) => setState(() => _selectedTopFamily = f),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            '$_dateRangeLabel — ${_selectedTopFamily[0].toUpperCase()}${_selectedTopFamily.substring(1)}',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
          ),
          const SizedBox(height: 16),
          items.isEmpty
              ? _noDataWidget(height: 80)
              : Column(
                  children: items.asMap().entries.map((e) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _buildTopWastedRow(e.key, e.value),
                    );
                  }).toList(),
                ),
        ],
      ),
    );
  }

  Widget _buildTopWastedRow(int index, TopWastedItem item) {
    final color = _pieColors[index % _pieColors.length];
    return Row(
      children: [
        Container(
          width: 9,
          height: 9,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.name,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Colors.black87,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    item.quantity.display,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '(${item.percentage.toStringAsFixed(1)}%)',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                  ),
                ],
              ),
              const SizedBox(height: 5),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: (item.percentage / 100).clamp(0.0, 1.0),
                  backgroundColor: Colors.grey.shade100,
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                  minHeight: 6,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Current Month Summary Card ───────────────────────────────────────────────

  Widget _buildCurrentMonthCard() {
    final cm = _monthlySummary!.currentMonth;
    final savedPct = cm.savedPercentage;
    final now = DateTime.now();
    const monthNames = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${monthNames[now.month]} ${now.year} Summary',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Current month performance',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Circular progress
              SizedBox(
                width: 80,
                height: 80,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: savedPct / 100,
                      backgroundColor: Colors.grey.shade200,
                      valueColor: const AlwaysStoppedAnimation<Color>(_green),
                      strokeWidth: 8,
                      strokeCap: StrokeCap.round,
                    ),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${savedPct.toStringAsFixed(0)}%',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const Text(
                          'saved',
                          style: TextStyle(fontSize: 9, color: Colors.black45),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  children: [
                    _buildFamilyRow('Saved', cm.saved, _green),
                    const SizedBox(height: 10),
                    _buildFamilyRow('Wasted', cm.wasted, _wastedColor),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFamilyRow(
    String label,
    MonthlyFamilyTotals totals,
    Color color,
  ) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.black54),
        ),
        const Spacer(),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (totals.weight.value > 0)
              Text(
                totals.weight.display,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            if (totals.volume.value > 0)
              Text(
                totals.volume.display,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            if (totals.count.value > 0)
              Text(
                totals.count.display,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            if (totals.weight.value == 0 &&
                totals.volume.value == 0 &&
                totals.count.value == 0)
              Text(
                'None',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
              ),
          ],
        ),
      ],
    );
  }

  // ── Shared Widgets ───────────────────────────────────────────────────────────

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _buildFamilyTabs(
    List<(String, String)> families,
    String selected,
    void Function(String) onSelect,
  ) {
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: families.map((f) {
          final isSel = selected == f.$1;
          return GestureDetector(
            onTap: () => onSelect(f.$1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isSel ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                boxShadow: isSel
                    ? [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 4,
                        ),
                      ]
                    : null,
              ),
              child: Text(
                f.$2,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isSel ? FontWeight.w700 : FontWeight.normal,
                  color: isSel ? Colors.black87 : Colors.black38,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.black45),
        ),
      ],
    );
  }

  Widget _noDataWidget({double height = 120}) {
    return SizedBox(
      height: height,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.bar_chart_outlined,
              size: 32,
              color: Colors.grey.shade300,
            ),
            const SizedBox(height: 8),
            Text(
              'No data for this period',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
            ),
          ],
        ),
      ),
    );
  }
}
