import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Send } from 'lucide-react';
import { z } from 'zod';

const requestSchema = z.object({
  issue_description: z.string().min(10, 'Please describe the issue in at least 10 characters').max(1000),
});

interface TenantInfo {
  id: string;
  room_no: string;
}

export default function SubmitRequest() {
  const { userRole, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userRole && userRole !== 'tenant') {
      navigate('/');
    }
  }, [userRole, navigate]);

  useEffect(() => {
    fetchTenantInfo();
  }, [user]);

  const fetchTenantInfo = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, room_no')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setTenantInfo(data);
    } catch (error) {
      console.error('Error fetching tenant info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantInfo) {
      toast({
        title: 'Error',
        description: 'Tenant information not found',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const validated = requestSchema.parse({ issue_description: issueDescription });

      const { error } = await supabase.from('maintenance_requests').insert({
        tenant_id: tenantInfo.id,
        room_no: tenantInfo.room_no,
        issue_description: validated.issue_description,
        status: 'open',
      });

      if (error) throw error;

      toast({
        title: 'Request submitted',
        description: 'Your maintenance request has been submitted successfully.',
      });

      setIssueDescription('');
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
          description: 'Failed to submit request',
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

  if (!tenantInfo) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Unable to find your tenant information.</p>
            <p className="text-sm text-muted-foreground mt-2">Please contact the admin.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Submit Maintenance Request</h1>
          <p className="text-muted-foreground">Report an issue in your room</p>
        </div>

        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">New Request</CardTitle>
                <CardDescription>Describe your maintenance issue</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room_no">Room Number</Label>
                <Input
                  id="room_no"
                  value={tenantInfo.room_no}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Room number is auto-filled from your profile
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue_description">Issue Description</Label>
                <Textarea
                  id="issue_description"
                  placeholder="Please describe the maintenance issue in detail..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Be as specific as possible to help us address the issue quickly
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
