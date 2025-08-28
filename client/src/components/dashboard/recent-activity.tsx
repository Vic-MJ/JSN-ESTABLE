import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Settings, Eye } from 'lucide-react';
import { useState } from 'react';
import { RepositionDetail } from '@/components/repositions/RepositionDetail';

interface RecentReposition {
  id: number;
  folio: string;
  type: string;
  status: string;
  currentArea: string;
  createdAt: string;
  solicitanteNombre: string;
  modeloPrenda: string;
  urgencia: string;
}

const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  aprobado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rechazado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  en_proceso: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completado: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  cancelado: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
};

const urgencyColors = {
  urgente: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  intermedio: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  poco_urgente: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
};

export function RecentActivity() {
  const [selectedReposition, setSelectedReposition] = useState<number | null>(null);

  const { data: activity } = useQuery({
    queryKey: ['/api/dashboard/recent-activity'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/recent-activity');
      if (!response.ok) throw new Error('Failed to fetch recent activity');
      return response.json();
    },
    refetchInterval: 2000, // Refetch cada 2 segundos
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    staleTime: 0, // Siempre considerar datos como stale
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City'
    });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-6 h-6 text-purple-600" />
            Reposiciones Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activity?.repositions?.length > 0 ? (
              activity.repositions.map((reposition: RecentReposition) => (
                <div key={reposition.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-base">{reposition.folio}</p>
                      <Badge className={statusColors[reposition.status as keyof typeof statusColors]}>
                        {reposition.status}
                      </Badge>
                      <Badge className={urgencyColors[reposition.urgencia as keyof typeof urgencyColors]}>
                        {reposition.urgencia}
                      </Badge>
                      <Badge variant="outline">
                        {reposition.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Modelo:</strong> {reposition.modeloPrenda}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(reposition.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm text-gray-600 font-medium">{reposition.currentArea}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 hover:bg-blue-50"
                      onClick={() => setSelectedReposition(reposition.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay reposiciones recientes</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedReposition && (
        <RepositionDetail
          repositionId={selectedReposition}
          onClose={() => setSelectedReposition(null)}
        />
      )}
    </>
  );
}