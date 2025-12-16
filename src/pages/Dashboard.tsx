import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import { supabase } from '@/integrations/supabase/client';
import { Users, IndianRupee, CheckCircle, AlertCircle, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Tenant {
  id: string;
  name: string;
  room_no: string;
}

interface RentPayment {
  tenant_id: string;
  amount: number;
}

interface MaintenanceRequest {
  id: string;
  room_no: string;
  issue_description: string;
  status: string;
  created_at: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Dashboard() {
  const { userRole } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paidTenants, setPaidTenants] = useState<string[]>([]);
  const [openRequests, setOpenRequests] = useState<MaintenanceRequest[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchAdminData();
    } else {
      fetchTenantData();
    }
  }, [userRole, selectedMonth, selectedYear]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch tenants
      const { data: tenantsData } = await supabase.from('tenants').select('*');
      setTenants(tenantsData || []);

      // Fetch rent payments for selected month/year
      const { data: paymentsData } = await supabase
        .from('rent_payments')
        .select('tenant_id, amount')
        .eq('month', selectedMonth)
        .eq('year', selectedYear);
      
      setPaidTenants(paymentsData?.map((p: RentPayment) => p.tenant_id) || []);

      // Fetch open maintenance requests
      const { data: requestsData } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setOpenRequests(requestsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantData = async () => {
    setLoading(true);
    try {
      // Fetch tenant's open maintenance requests
      const { data: requestsData } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      setOpenRequests(requestsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (userRole === 'admin') {
    const dueTenants = tenants.filter(t => !paidTenants.includes(t.id));

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Overview of your PG operations</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Tenants"
              value={tenants.length}
              icon={<Users className="w-6 h-6" />}
            />
            <StatCard
              title="Rent Paid"
              value={paidTenants.length}
              icon={<CheckCircle className="w-6 h-6" />}
              variant="success"
            />
            <StatCard
              title="Rent Due"
              value={dueTenants.length}
              icon={<AlertCircle className="w-6 h-6" />}
              variant={dueTenants.length > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="Open Requests"
              value={openRequests.length}
              icon={<Wrench className="w-6 h-6" />}
              variant={openRequests.length > 0 ? 'destructive' : 'default'}
            />
          </div>

          {/* Due Tenants */}
          {dueTenants.length > 0 && (
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  Rent Due - {MONTHS[selectedMonth - 1]} {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dueTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">Room {tenant.room_no}</p>
                      </div>
                      <Badge variant="outline" className="border-warning text-warning">
                        Due
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Maintenance Requests */}
          {openRequests.length > 0 && (
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-destructive" />
                  Open Maintenance Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {openRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">Room {request.room_no}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {request.issue_description}
                        </p>
                      </div>
                      <Badge variant="destructive">Open</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Tenant Dashboard
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">Your PG tenant dashboard</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="Open Requests"
            value={openRequests.length}
            icon={<Wrench className="w-6 h-6" />}
            variant={openRequests.length > 0 ? 'warning' : 'default'}
          />
        </div>

        {openRequests.length > 0 && (
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Your Open Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {openRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium">Room {request.room_no}</p>
                      <Badge variant="outline" className="border-warning text-warning">
                        Open
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.issue_description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Submitted: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
