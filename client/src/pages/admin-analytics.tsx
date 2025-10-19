import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { TrendingUp, DollarSign, Calendar, XCircle } from "lucide-react";

const COLORS = ['hsl(210 85% 55%)', 'hsl(145 55% 45%)', 'hsl(25 75% 55%)', 'hsl(280 65% 60%)', 'hsl(45 90% 50%)'];

export default function AdminAnalytics() {
  const [revenueGroupBy, setRevenueGroupBy] = useState<"hostess" | "location" | "service">("hostess");
  const [trendDays, setTrendDays] = useState(30);

  const { data: revenueData, isLoading: revenueLoading } = useQuery<{ name: string; revenue: number; bookings: number }[]>({
    queryKey: ['/api/analytics/revenue', revenueGroupBy],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/revenue?groupBy=${revenueGroupBy}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });

  const { data: trendData, isLoading: trendLoading } = useQuery<{ date: string; bookings: number; confirmed: number; cancelled: number }[]>({
    queryKey: ['/api/analytics/bookings-trend', trendDays],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/bookings-trend?days=${trendDays}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });

  const { data: cancellationData, isLoading: cancellationLoading } = useQuery<{
    total: number;
    cancelled: number;
    confirmed: number;
    pending: number;
    cancellationRate: number;
  }>({
    queryKey: ['/api/analytics/cancellations'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/cancellations', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Calculate totals
  const totalRevenue = revenueData?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const totalBookings = revenueData?.reduce((sum, item) => sum + item.bookings, 0) || 0;

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive insights into your business performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-revenue">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From {totalBookings} active bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-bookings">{cancellationData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All time bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-confirmed-rate">
              {cancellationData ? ((cancellationData.confirmed / cancellationData.total) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{cancellationData?.confirmed || 0} confirmed bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-cancellation-rate">{cancellationData?.cancellationRate?.toFixed(1) ?? "0.0"}%</div>
            <p className="text-xs text-muted-foreground">{cancellationData?.cancelled || 0} cancelled bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue Analysis</CardTitle>
              <CardDescription>Revenue breakdown by {revenueGroupBy}</CardDescription>
            </div>
            <Select value={revenueGroupBy} onValueChange={(value) => setRevenueGroupBy(value as any)}>
              <SelectTrigger className="w-[180px]" data-testid="select-revenue-groupby">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hostess">By Hostess</SelectItem>
                <SelectItem value="location">By Location</SelectItem>
                <SelectItem value="service">By Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading chart...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(210 85% 55%)" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Booking Trends */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Booking Trends</CardTitle>
              <CardDescription>Bookings over the last {trendDays} days</CardDescription>
            </div>
            <Select value={String(trendDays)} onValueChange={(value) => setTrendDays(Number(value))}>
              <SelectTrigger className="w-[180px]" data-testid="select-trend-days">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading chart...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="confirmed" stroke="hsl(145 55% 45%)" name="Confirmed" strokeWidth={2} />
                <Line type="monotone" dataKey="cancelled" stroke="hsl(0 75% 60%)" name="Cancelled" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Booking Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Status Distribution</CardTitle>
          <CardDescription>Overview of all booking statuses</CardDescription>
        </CardHeader>
        <CardContent>
          {cancellationLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Loading chart...</p>
            </div>
          ) : cancellationData ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Confirmed', value: cancellationData.confirmed },
                    { name: 'Cancelled', value: cancellationData.cancelled },
                    { name: 'Pending', value: cancellationData.pending },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Confirmed', value: cancellationData.confirmed },
                    { name: 'Cancelled', value: cancellationData.cancelled },
                    { name: 'Pending', value: cancellationData.pending },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
