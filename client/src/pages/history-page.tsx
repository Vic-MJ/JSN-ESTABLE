
import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Calendar, Filter, Download, Trash2, Eye, FileText, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Reposition, type Area } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { HistoryTimeline } from "@/components/shared/HistoryTimeline";
import { apiRequest } from "@/lib/queryClient";
import Swal from 'sweetalert2';

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accidentFilter, setAccidentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const [selectedRepositionId, setSelectedRepositionId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: repositions = [], isLoading } = useQuery<Reposition[]>({
    queryKey: ["/api/repositions/history"],
  });

  const getAreaDisplayName = (area: Area) => {
    const names: Record<Area, string> = {
      corte: 'Corte',
      bordado: 'Bordado',
      ensamble: 'Ensamble',
      plancha: 'Plancha/Empaque',
      calidad: 'Calidad',
      envios: 'Envíos',
      admin: 'Admin'
    };
    return names[area] || area;
  };

  const getAreaBadgeColor = (area: Area) => {
    const colors: Record<Area, string> = {
      corte: "badge-corte",
      bordado: "badge-bordado",
      ensamble: "badge-ensamble", 
      plancha: "badge-plancha",
      calidad: "badge-calidad",
      envios: "badge-envios",
      almacen: "bg-indigo-100 text-indigo-800",
      admin: "badge-admin",
    };
    return colors[area] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      'completado': "bg-green-100 text-green-800",
      'en_proceso': "bg-blue-100 text-blue-800",
      'pendiente': "bg-yellow-100 text-yellow-800",
      'cancelado': "bg-red-100 text-red-800",
      'pausado': "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getUrgencyBadgeColor = (urgency: string) => {
    const colors: Record<string, string> = {
      'alta': "bg-red-100 text-red-800",
      'media': "bg-yellow-100 text-yellow-800",
      'baja': "bg-green-100 text-green-800"
    };
    return colors[urgency] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City'
    });
  };

  // Función para verificar si una reposición debe ser visible según las reglas de tiempo
  const isRepositionVisible = (reposition: Reposition) => {
    // Si el usuario es admin o envíos, pueden ver todas
    if (user?.area === 'admin' || user?.area === 'envios') {
      return true;
    }

    // Si no está finalizada, siempre es visible
    if (!reposition.finalizadoAt && !reposition.completedAt) return true;

    const now = new Date();
    const finalized = new Date(reposition.finalizadoAt || reposition.completedAt);
    const hoursSinceFinalized = (now.getTime() - finalized.getTime()) / (1000 * 60 * 60);

    // Si es el área solicitante (creadora), puede ver por 24 horas
    if (user?.area === reposition.solicitanteArea) {
      return hoursSinceFinalized <= 24;
    }

    // Para otras áreas, pueden ver por 12 horas
    return hoursSinceFinalized <= 12;
  };

  const filteredRepositions = repositions.filter(reposition => {
    // Aplicar filtro de visibilidad temporal
    if (!isRepositionVisible(reposition)) return false;

    const matchesSearch = searchTerm === "" || 
      reposition.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reposition.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reposition.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reposition.motivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reposition.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea = areaFilter === "all" || 
      reposition.currentArea === areaFilter || 
      reposition.solicitanteArea === areaFilter;

    const matchesStatus = statusFilter === "all" || reposition.status === statusFilter;

    const matchesUrgency = urgencyFilter === "all" || reposition.urgencia === urgencyFilter;

    const matchesType = typeFilter === "all" || reposition.tipo === typeFilter;

    const matchesAccident = accidentFilter === "all" || 
      (accidentFilter === "with_accident" && reposition.areaCausanteDano) ||
      (accidentFilter === "without_accident" && !reposition.areaCausanteDano);

    const matchesDate = (() => {
      if (dateFilter === "all") return true;

      const repositionDate = new Date(reposition.createdAt);
      const now = new Date();

      switch (dateFilter) {
        case "today":
          return repositionDate.toDateString() === now.toDateString();
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return repositionDate >= weekAgo;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return repositionDate >= monthAgo;
        case "quarter":
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          return repositionDate >= quarterAgo;
        case "semester":
          const semesterAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          return repositionDate >= semesterAgo;
        case "year":
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return repositionDate >= yearAgo;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesArea && matchesStatus && matchesDate && 
           matchesUrgency && matchesType && matchesAccident;
  }).sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case "createdAt":
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      case "finalizadoAt":
        aValue = a.finalizadoAt ? new Date(a.finalizadoAt) : new Date(0);
        bValue = b.finalizadoAt ? new Date(b.finalizadoAt) : new Date(0);
        break;
      case "folio":
        aValue = a.folio;
        bValue = b.folio;
        break;
      case "cliente":
        aValue = a.cliente || "";
        bValue = b.cliente || "";
        break;
      case "piezas":
        aValue = a.piezas;
        bValue = b.piezas;
        break;
      default:
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const completedRepositions = filteredRepositions.filter(repo => repo.status === 'completado');
  const activeRepositions = filteredRepositions.filter(repo => repo.status === 'en_proceso');
  const pendingRepositions = filteredRepositions.filter(repo => repo.status === 'pendiente');

  const deleteMutation = useMutation({
    mutationFn: async (repositionId: number) => {
      const response = await fetch(`/api/repositions/${repositionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar reposición');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repositions/history"] });
      toast({
        title: "Reposición eliminada",
        description: "La reposición ha sido eliminada correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteReposition = async (repositionId: number) => {
    if (user?.area !== 'admin' && user?.area !== 'envios') {
      toast({
        title: "Sin permisos",
        description: "Solo Admin o Envíos pueden eliminar reposiciones",
        variant: "destructive",
      });
      return;
    }

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      deleteMutation.mutate(repositionId);
    }
  };

  const handleExportToExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/repositions/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm,
          statusFilter,
          areaFilter,
          dateFilter,
          repositions: filteredRepositions
        }),
      });

      if (!response.ok) {
        throw new Error('Error al exportar datos');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `historial-reposiciones-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Éxito",
        description: "Historial exportado correctamente",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "No se pudo exportar el historial",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Historial de Reposiciones</h1>
          <p className="text-gray-600 mt-2">Registro completo de todas las reposiciones del sistema</p>
          {user?.area !== 'admin' && user?.area !== 'envios' && (
            <p className="text-sm text-yellow-600 mt-1">
              * Las reposiciones finalizadas se ocultan después de {user?.area ? 
                (filteredRepositions.some(r => r.solicitanteArea === user.area) ? '24 horas' : '12 horas') 
                : '12 horas'}
            </p>
          )}
        </div>
        <Button 
          variant="outline" 
          onClick={handleExportToExcel}
          disabled={isExporting || filteredRepositions.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exportando...' : 'Exportar Excel'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total de Reposiciones</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRepositions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingRepositions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">En Proceso</p>
              <p className="text-2xl font-bold text-blue-600">{activeRepositions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-green-600">{completedRepositions.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <Search className="w-5 h-5" />
            Búsqueda y Filtros Avanzados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <Input
                type="text"
                placeholder="Buscar por folio, cliente, modelo, motivo, descripción..."
                className="pl-10 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-300" />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Áreas</SelectItem>
                <SelectItem value="corte">Corte</SelectItem>
                <SelectItem value="bordado">Bordado</SelectItem>
                <SelectItem value="ensamble">Ensamble</SelectItem>
                <SelectItem value="plancha">Plancha/Empaque</SelectItem>
                <SelectItem value="calidad">Calidad</SelectItem>
                <SelectItem value="envios">Envíos</SelectItem>
                <SelectItem value="almacen">Almacén</SelectItem>
                <SelectItem value="diseño">Diseño</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el tiempo</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
                <SelectItem value="quarter">Último trimestre</SelectItem>
                <SelectItem value="semester">Último semestre</SelectItem>
                <SelectItem value="year">Último año</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Urgencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las urgencias</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="reparacion">Reparación</SelectItem>
                <SelectItem value="rehechura">Rehechura</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
                <SelectItem value="calidad">Control de Calidad</SelectItem>
              </SelectContent>
            </Select>

            <Select value={accidentFilter} onValueChange={setAccidentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Área causante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="with_accident">Con área causante</SelectItem>
                <SelectItem value="without_accident">Sin área causante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Controles de ordenamiento */}
          <div className="flex flex-wrap gap-4 mt-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Ordenar por:</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Fecha creación</SelectItem>
                  <SelectItem value="finalizadoAt">Fecha finalización</SelectItem>
                  <SelectItem value="folio">Folio</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="piezas">Cantidad piezas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Orden:</label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descendente</SelectItem>
                  <SelectItem value="asc">Ascendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumen de filtros activos */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(searchTerm || statusFilter !== 'all' || areaFilter !== 'all' || dateFilter !== 'all' || urgencyFilter !== 'all' || typeFilter !== 'all' || accidentFilter !== 'all') && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtros activos:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Búsqueda: "{searchTerm.substring(0, 20)}{searchTerm.length > 20 ? '...' : ''}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setAreaFilter('all');
                    setDateFilter('all');
                    setUrgencyFilter('all');
                    setTypeFilter('all');
                    setAccidentFilter('all');
                  }}
                  className="h-6 text-xs"
                >
                  Limpiar todo
                </Button>
              </div>
            )}
          </div>

          {/* Estadísticas de resultados */}
          <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Mostrando <span className="font-semibold text-gray-900 dark:text-white">{filteredRepositions.length}</span> de <span className="font-semibold text-gray-900 dark:text-white">{repositions.length}</span> reposiciones
              {filteredRepositions.length !== repositions.length && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  ({Math.round((filteredRepositions.length / repositions.length) * 100)}% del total)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Repositions List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Historial de Reposiciones ({filteredRepositions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRepositions.map((reposition) => (
                <div key={reposition.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-800">{reposition.folio}</h3>
                          <p className="text-sm text-gray-600">{reposition.cliente}</p>
                        </div>
                        <Badge className={getStatusBadgeColor(reposition.status)}>
                          {reposition.status === 'completado' ? 'Completado' : 
                           reposition.status === 'en_proceso' ? 'En Proceso' : 
                           reposition.status === 'pendiente' ? 'Pendiente' :
                           reposition.status === 'cancelado' ? 'Cancelado' : 'Pausado'}
                        </Badge>
                        <Badge className={getAreaBadgeColor(reposition.currentArea)}>
                          {getAreaDisplayName(reposition.currentArea)}
                        </Badge>
                        {reposition.urgencia && (
                          <Badge className={getUrgencyBadgeColor(reposition.urgencia)}>
                            {reposition.urgencia.toUpperCase()}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Modelo:</span> {reposition.modelo}
                        </div>
                        <div>
                          <span className="font-medium">Tipo:</span> {reposition.tipo}
                        </div>
                        <div>
                          <span className="font-medium">Piezas:</span> {reposition.piezas}
                        </div>
                        <div>
                          <span className="font-medium">Motivo:</span> {reposition.motivo}
                        </div>
                        <div>
                          <span className="font-medium">Solicitante:</span> {getAreaDisplayName(reposition.solicitanteArea)}
                        </div>
                        {reposition.areaCausanteDano && (
                          <div>
                            <span className="font-medium">Área causante:</span> {getAreaDisplayName(reposition.areaCausanteDano)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500">Creado</p>
                      <p className="text-sm font-medium">{formatDate(reposition.createdAt)}</p>
                      {reposition.finalizadoAt && (
                        <>
                          <p className="text-sm text-gray-500 mt-2">Finalizado</p>
                          <p className="text-sm font-medium">{formatDate(reposition.finalizadoAt)}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRepositionId(reposition.id);
                        setShowHistory(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Historial
                    </Button>
                    {(user?.area === 'admin' || user?.area === 'envios') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReposition(reposition.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredRepositions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No se encontraron reposiciones con los filtros aplicados</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* History Modal */}
      {showHistory && selectedRepositionId && (
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historial de Reposición</DialogTitle>
            </DialogHeader>
            <RepositionHistoryContent repositionId={selectedRepositionId} />
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}

// Componente para mostrar el historial de una reposición específica
function RepositionHistoryContent({ repositionId }: { repositionId: number }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: [`/api/repositions/${repositionId}/history`],
  });

  if (isLoading) {
    return <div>Cargando historial...</div>;
  }

  return (
    <HistoryTimeline 
      events={history} 
      title="Cronología de eventos" 
      type="reposition"
      showDetailedInfo={true}
    />
  );
}
