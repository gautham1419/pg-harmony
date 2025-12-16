import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Wrench, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MaintenanceRequest {
  id: string;
  tenant_id: string;
  room_no: string;
  issue_description: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  tenants?: {
    name: string;
  };
}

export default function MaintenanceManagement() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      navigate('/');
    }
  }, [userRole, navigate]);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('maintenance_requests')
        .select('*, tenants(name)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Request resolved',
        description: 'Maintenance request has been marked as resolved.',
      });

      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update request',
        variant: 'destructive',
      });
    }
  };

  const openCount = requests.filter(r => r.status === 'open').length;
  const resolvedCount = requests.filter(r => r.status === 'resolved').length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Maintenance Requests</h1>
            <p className="text-muted-foreground">Manage tenant maintenance complaints</p>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'open' | 'resolved')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-xl font-bold">{requests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open</p>
                  <p className="text-xl font-bold">{openCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-xl font-bold">{resolvedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">All Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No maintenance requests found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead className="max-w-[300px]">Issue</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.room_no}</TableCell>
                        <TableCell>{request.tenants?.name || 'Unknown'}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate">{request.issue_description}</p>
                        </TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {request.status === 'open' ? (
                            <Badge variant="destructive">Open</Badge>
                          ) : (
                            <Badge className="bg-success hover:bg-success">Resolved</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {request.status === 'open' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(request.id)}
                            >
                              Mark Resolved
                            </Button>
                          )}
                          {request.status === 'resolved' && request.resolved_at && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(request.resolved_at).toLocaleDateString()}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
