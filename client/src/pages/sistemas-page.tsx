
import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Eye, CheckCircle, X, AlertCircle, Clock, Headphones, Pause, Ban } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ticketFormSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  category: z.enum(["soporte_tecnico", "solicitud_acceso", "reporte_error", "mejora_sistema", "otro"]),
  priority: z.enum(["baja", "media", "alta", "critica"]),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

const categoryLabels = {
  soporte_tecnico: "Soporte Técnico",
  solicitud_acceso: "Solicitud de Acceso",
  reporte_error: "Reporte de Error",
  mejora_sistema: "Mejora del Sistema",
  otro: "Otro"
};

const priorityLabels = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica"
};

const statusLabels = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  finalizado: "Finalizado",
  cancelado: "Cancelado"
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'baja': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'media': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'alta': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'critica': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'aprobado': return 'bg-green-100 text-green-800 border-green-300';
    case 'rechazado': return 'bg-red-100 text-red-800 border-red-300';
    case 'finalizado': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'cancelado': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export default function SistemasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const isSistemas = user?.area === 'sistemas';

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "soporte_tecnico",
      priority: "media",
    },
  });

  // Query para obtener tickets
  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tickets", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      
      const response = await fetch(`/api/tickets?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cargar tickets');
      return response.json();
    }
  });

  // Mutación para crear ticket
  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al crear ticket');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Ticket creado",
        description: "El ticket ha sido creado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutación para actualizar estado del ticket
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: number; status: string }) => {
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al actualizar ticket');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Estado actualizado",
        description: "El estado del ticket ha sido actualizado",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateTicket = (data: TicketFormData) => {
    createTicketMutation.mutate(data);
  };

  const handleStatusUpdate = (ticketId: number, status: string) => {
    updateTicketStatusMutation.mutate({ ticketId, status });
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchTerm === "" || 
      ticket.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Headphones className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                Sistema de Soporte
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestión de tickets y solicitudes de soporte técnico
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Ticket
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-blue-200 dark:border-slate-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <Search className="w-5 h-5" />
              Búsqueda y Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Buscar por folio, título o descripción..."
                  className="pl-10 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="aprobado">Aprobados</SelectItem>
                  <SelectItem value="rechazado">Rechazados</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Grid */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No se encontraron tickets</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          {ticket.folio}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {priorityLabels[ticket.priority as keyof typeof priorityLabels]}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {statusLabels[ticket.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {ticket.title}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                        <span>
                          Categoría: {categoryLabels[ticket.category as keyof typeof categoryLabels]}
                        </span>
                        <span>
                          Creado por: {ticket.createdByUser?.name || 'Usuario'}
                        </span>
                      </div>
                    </div>
                    
                    {isSistemas && (
                      <div className="flex gap-2 ml-4">
                        {ticket.status === 'pendiente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(ticket.id, 'aprobado')}
                            className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                        )}
                        {ticket.status === 'pendiente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(ticket.id, 'rechazado')}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        )}
                        {ticket.status === 'aprobado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(ticket.id, 'finalizado')}
                            className="text-blue-600 hover:text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Finalizar
                          </Button>
                        )}
                        {['pendiente', 'aprobado'].includes(ticket.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(ticket.id, 'cancelado')}
                            className="text-gray-600 hover:text-gray-700 border-gray-200 hover:bg-gray-50"
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Ticket Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Ticket de Soporte</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(handleCreateTicket)} className="space-y-4">
              <div>
                <Label htmlFor="title">Título del Ticket *</Label>
                <Input
                  id="title"
                  placeholder="Describe brevemente el problema o solicitud"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descripción Detallada *</Label>
                <Textarea
                  id="description"
                  placeholder="Proporciona todos los detalles necesarios para entender y resolver el problema"
                  rows={4}
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(value) => form.setValue("category", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soporte_tecnico">Soporte Técnico</SelectItem>
                      <SelectItem value="solicitud_acceso">Solicitud de Acceso</SelectItem>
                      <SelectItem value="reporte_error">Reporte de Error</SelectItem>
                      <SelectItem value="mejora_sistema">Mejora del Sistema</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridad *</Label>
                  <Select
                    value={form.watch("priority")}
                    onValueChange={(value) => form.setValue("priority", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTicketMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createTicketMutation.isPending ? 'Creando...' : 'Crear Ticket'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
