import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, FileText, Calendar, User, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: Record<string, any>;
}

export function OrganizationAuditLogs() {
  const { organization, loading: orgLoading } = useOrganization();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'users' | 'projects' | 'settings'>('all');

  useEffect(() => {
    if (organization) {
      loadAuditLogs();
    }
  }, [organization, filter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      // TODO: Implement audit log fetching from database
      // For now, return empty array
      // const { data, error } = await supabase
      //   .from('audit_logs')
      //   .select('*')
      //   .eq('organizationId', organization.id)
      //   .order('timestamp', { ascending: false })
      //   .limit(100);
      
      // Simulated data for UI
      setLogs([]);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || log.resource === filter;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
      read: 'outline',
    };

    return (
      <Badge variant={variants[action] || 'outline'}>
        {action.toUpperCase()}
      </Badge>
    );
  };

  if (orgLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track all activities and changes in your organization
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'users' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('users')}
              >
                Users
              </Button>
              <Button
                variant={filter === 'projects' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('projects')}
              >
                Projects
              </Button>
              <Button
                variant={filter === 'settings' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('settings')}
              >
                Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Recent activities and changes in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
              <p className="text-sm mt-2">
                {logs.length === 0 
                  ? 'Audit logging will appear here once implemented'
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(log.timestamp)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="capitalize">{log.resource}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{log.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {JSON.stringify(log.details)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
