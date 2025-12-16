import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users } from 'lucide-react';
import { z } from 'zod';

const tenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  room_no: z.string().min(1, 'Room number is required').max(10),
  contact: z.string().min(10, 'Valid contact number required').max(15),
  deposit_amount: z.number().min(0, 'Deposit must be positive'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface Tenant {
  id: string;
  name: string;
  room_no: string;
  contact: string;
  deposit_amount: number;
  auth_user_id: string | null;
  created_at: string;
}

export default function TenantManagement() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    room_no: '',
    contact: '',
    deposit_amount: '',
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      navigate('/');
    }
  }, [userRole, navigate]);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('room_no', { ascending: true });

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const validated = tenantSchema.parse({
        ...formData,
        deposit_amount: Number(formData.deposit_amount),
      });

      // Create auth user for tenant
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create tenant record
      const { error: tenantError } = await supabase.from('tenants').insert({
        name: validated.name,
        room_no: validated.room_no,
        contact: validated.contact,
        deposit_amount: validated.deposit_amount,
        auth_user_id: authData.user.id,
      });

      if (tenantError) throw tenantError;

      // Assign tenant role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'tenant',
      });

      if (roleError) throw roleError;

      toast({
        title: 'Tenant added',
        description: `${validated.name} has been added successfully.`,
      });

      setDialogOpen(false);
      setFormData({
        name: '',
        room_no: '',
        contact: '',
        deposit_amount: '',
        email: '',
        password: '',
      });
      fetchTenants();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to add tenant',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold">Tenant Management</h1>
            <p className="text-muted-foreground">Manage your PG tenants</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Tenant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="room_no">Room Number</Label>
                    <Input
                      id="room_no"
                      value={formData.room_no}
                      onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Security Deposit (₹)</Label>
                  <Input
                    id="deposit_amount"
                    type="number"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                    required
                  />
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Login Credentials</p>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Tenant'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Tenants ({tenants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tenants yet. Click "Add Tenant" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Deposit</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>{tenant.room_no}</TableCell>
                        <TableCell>{tenant.contact}</TableCell>
                        <TableCell className="text-right">₹{tenant.deposit_amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
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
