import { useMemo } from 'react';
import { useTodayOrders, useOrders } from '@/hooks/useOrders';
import { formatRupiah } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { data: todayOrders } = useTodayOrders();
  const { data: allOrders } = useOrders(500);

  const todayStats = useMemo(() => {
    if (!todayOrders) return { revenue: 0, count: 0, items: 0, avgTicket: 0 };
    const revenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const items = todayOrders.reduce((s, o) => s + o.order_items.length, 0);
    return {
      revenue,
      count: todayOrders.length,
      items,
      avgTicket: todayOrders.length > 0 ? Math.round(revenue / todayOrders.length) : 0,
    };
  }, [todayOrders]);

  const chartData = useMemo(() => {
    if (!allOrders) return [];
    const grouped: Record<string, number> = {};
    allOrders.forEach((o) => {
      const date = new Date(o.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      grouped[date] = (grouped[date] || 0) + o.total;
    });
    return Object.entries(grouped)
      .slice(-7)
      .map(([date, total]) => ({ date, total }));
  }, [allOrders]);

  const stats = [
    { label: 'Pendapatan Hari Ini', value: formatRupiah(todayStats.revenue), icon: DollarSign, color: 'text-success' },
    { label: 'Transaksi', value: String(todayStats.count), icon: ShoppingCart, color: 'text-primary' },
    { label: 'Item Terjual', value: String(todayStats.items), icon: TrendingUp, color: 'text-warning' },
    { label: 'Rata-rata', value: formatRupiah(todayStats.avgTicket), icon: Users, color: 'text-accent-foreground' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-lg font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Pendapatan 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatRupiah(value), 'Pendapatan']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data</p>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Pesanan Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayOrders?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Belum ada pesanan hari ini</p>
          ) : (
            <div className="space-y-2">
              {todayOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <span className="font-mono text-xs">{order.order_number}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {order.order_items.length} item
                    </span>
                  </div>
                  <span className="font-medium">{formatRupiah(order.total)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
