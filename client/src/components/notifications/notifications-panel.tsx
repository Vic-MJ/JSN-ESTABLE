import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle, Info, Clock, Bell, Package, RefreshCw, Plus, X, XCircle, Trash2, BellRing, Settings, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { type Transfer } from "@shared/schema";
import { useState, useEffect } from "react";
import { NotificationPermission } from './notification-permission';
import { format } from "date-fns"; // Importar format de date-fns

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedNotifications, setExpandedNotifications] = useState<Set<number>>(new Set());
  const [disintegratingNotifications, setDisintegratingNotifications] = useState<Set<number>>(new Set());

  // Agregar estilos CSS para la animación
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes disintegrate {
        0% {
          transform: scale(1);
          opacity: 1;
          filter: blur(0px);
        }
        25% {
          transform: scale(1.05) rotate(1deg);
          opacity: 0.8;
        }
        50% {
          transform: scale(0.95) rotate(-0.5deg);
          opacity: 0.6;
          filter: blur(1px);
        }
        75% {
          transform: scale(0.8) rotate(0.5deg);
          opacity: 0.3;
          filter: blur(2px);
        }
        100% {
          transform: scale(0.6) rotate(0deg);
          opacity: 0;
          filter: blur(3px);
        }
      }

      @keyframes particle-float {
        0% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateY(-20px) scale(0);
          opacity: 0;
        }
      }

      .disintegrating {
        animation: disintegrate 0.8s ease-in-out forwards;
        position: relative;
        overflow: hidden;
      }

      .disintegrating::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%);
        animation: particle-float 0.8s ease-out forwards;
        pointer-events: none;
      }

      .disintegrating::after {
        content: '';
        position: absolute;
        top: 10%;
        left: 10%;
        right: 10%;
        bottom: 10%;
        background: 
          radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.5), transparent),
          radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,0.4), transparent),
          radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.6), transparent),
          radial-gradient(1px 1px at 60% 90%, rgba(255,255,255,0.3), transparent),
          radial-gradient(2px 2px at 80% 10%, rgba(255,255,255,0.4), transparent);
        animation: particle-float 0.6s 0.2s ease-out forwards;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);


  const { data: pendingTransfers = [] } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers/pending"],
    enabled: open,
  });

  const { data: repositionNotifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: open,
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      const allNotifications = await res.json();
      return allNotifications.filter((n: any) => 
        !n.read && (
          n.type?.includes('reposition') || 
          n.type?.includes('completion') ||
          n.type === 'new_reposition' ||
          n.type === 'reposition_transfer' ||
          n.type === 'reposition_approved' ||
          n.type === 'reposition_rejected' ||
          n.type === 'reposition_completed' ||
          n.type === 'reposition_deleted' ||
          n.type === 'completion_approval_needed' ||
          n.type === 'partial_transfer_warning'
        )
      );
    },
  });

  const acceptTransferMutation = useMutation({
    mutationFn: async (transferId: number) => {
      const res = await apiRequest("POST", `/api/transfers/${transferId}/accept`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transferencia aceptada",
        description: "La transferencia ha sido aceptada exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al aceptar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectTransferMutation = useMutation({
    mutationFn: async (transferId: number) => {
      const res = await apiRequest("POST", `/api/transfers/${transferId}/reject`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transferencia rechazada",
        description: "La transferencia ha sido rechazada",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al rechazar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      // Agregar la notificación al conjunto de desintegración
      setDisintegratingNotifications(prev => new Set([...prev, notificationId]));

      // Esperar un poco para que se vea la animación
      await new Promise(resolve => setTimeout(resolve, 800));

      const res = await apiRequest("POST", `/api/repositions/${notificationId}/read`);
      return await res.json();
    },
    onSuccess: (_, notificationId) => {
      // Remover de la lista de desintegración después de completar
      setDisintegratingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (_, notificationId) => {
      // Si hay error, también remover de la lista de desintegración
      setDisintegratingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    },
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/clear-all");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Notificaciones limpiadas",
        description: "Todas las notificaciones han sido marcadas como leídas",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al limpiar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getAreaDisplayName = (area: string) => {
    const names: Record<string, string> = {
      corte: "Corte",
      bordado: "Bordado",
      ensamble: "Ensamble",
      plancha: "Plancha/Empaque",
      calidad: "Calidad",
      envios: "Envíos",
      admin: "Admin",
      diseño: "Diseño",
    };
    return names[area] || area;
  };

  const formatTimeAgo = (dateInput: string | Date) => {
    // Convertir a Date si es string
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();

    // Calcular diferencia directamente sin conversiones adicionales
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Formato de hora local (sin especificar zona horaria)
    const timeFormat = date.toLocaleString("es-MX", { 
      timeZone: "America/Mexico_City",
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });

    const dateTimeFormat = date.toLocaleString("es-MX", { 
      timeZone: "America/Mexico_City",
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });

    if (diffDays > 7) {
      // Para fechas muy antiguas, mostrar fecha completa
      return dateTimeFormat;
    } else if (diffDays > 0) {
      return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""} - ${timeFormat}`;
    } else if (diffHours > 0) {
      return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""} - ${timeFormat}`;
    } else if (diffMinutes > 5) {
      return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""} - ${timeFormat}`;
    } else if (diffMinutes > 0) {
      return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
    } else {
      return "Hace unos segundos";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return <ArrowRight className="w-4 h-4" />;
      case 'order_completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'order_created':
        return <Plus className="w-4 h-4" />;
      case 'new_reposition':
      case 'reposition_created':
        return <Plus className="w-4 h-4" />;
      case 'reposition_approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'reposition_rejected':
        return <XCircle className="w-4 h-4" />;
      case 'reposition_completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'reposition_deleted':
        return <Trash2 className="w-4 h-4" />;
      case 'reposition_transfer':
        return <ArrowRight className="w-4 h-4" />;
      case 'transfer_processed':
        return <RefreshCw className="w-4 h-4" />;
      case 'reposition_received':
        return <Package className="w-4 h-4" />;
      case 'completion_approval_needed':
        return <Clock className="w-4 h-4" />;
      case 'partial_transfer_warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'transfer':
      case 'reposition_transfer':
      case 'transfer_processed':
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800";
      case 'order_completed':
      case 'reposition_approved':
      case 'reposition_completed':
      case 'reposition_received':
        return "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800";
      case 'order_created':
      case 'new_reposition':
      case 'reposition_created':
        return "bg-purple-50 border-purple-200 dark:bg-purple-950/50 dark:border-purple-800";
      case 'reposition_rejected':
      case 'reposition_deleted':
        return "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800";
      case 'completion_approval_needed':
      case 'partial_transfer_warning':
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800";
      default:
        return "bg-muted border-border";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'transfer':
      case 'reposition_transfer':
      case 'transfer_processed':
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30";
      case 'order_completed':
      case 'reposition_approved':
      case 'reposition_completed':
      case 'reposition_received':
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
      case 'order_created':
      case 'new_reposition':
      case 'reposition_created':
        return "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30";
      case 'reposition_rejected':
      case 'reposition_deleted':
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
      case 'completion_approval_needed':
      case 'partial_transfer_warning':
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const totalNotifications = repositionNotifications.length + pendingTransfers.length;

  const toggleNotificationExpansion = (notificationId: number) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const isNotificationExpanded = (notificationId: number) => {
    return expandedNotifications.has(notificationId);
  };



  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[90vw] sm:w-[420px] md:w-[480px] lg:w-[540px] max-w-[600px] bg-background border-l border-border flex flex-col h-full">
        <SheetHeader className="border-b border-border pb-6">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                  <BellRing className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Notificaciones
                </h2>
                <p className="text-sm text-muted-foreground font-normal">
                  {totalNotifications > 0 ? `${totalNotifications} notificación${totalNotifications > 1 ? 'es' : ''} pendiente${totalNotifications > 1 ? 's' : ''}` : 'Todo al día'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {repositionNotifications.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clearAllNotificationsMutation.mutate()}
                  disabled={clearAllNotificationsMutation.isPending}
                  className="h-8 px-3 text-xs"
                >
                  {clearAllNotificationsMutation.isPending ? (
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  )}
                  Limpiar todo
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-4 max-h-[calc(100vh-12rem)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
          {/* <NotificationPermission /> */}
          {repositionNotifications.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <h3 className="text-sm font-semibold text-foreground">Reposiciones</h3>
                <Badge variant="secondary" className="text-xs">
                  {repositionNotifications.length}
                </Badge>
              </div>
              {repositionNotifications.map((notification: any) => {
                const isExpanded = isNotificationExpanded(notification.id);
                const messageLength = notification.message?.length || 0;
                const shouldShowExpandButton = messageLength > 100;

                const isDisintegrating = disintegratingNotifications.has(notification.id);

                return (
                  <div
                    key={notification.id}
                    className={`relative overflow-hidden rounded-lg border ${getNotificationColor(notification.type)} transition-all duration-200 hover:shadow-md group ${isDisintegrating ? 'disintegrating' : ''}`}
                  >
                    <div className="relative p-3 md:p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 md:w-12 md:h-12 ${getIconColor(notification.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-foreground text-sm leading-tight flex-1">
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {shouldShowExpandButton && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-black/5 dark:hover:bg-white/5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNotificationExpansion(notification.id);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-black/5 dark:hover:bg-white/5"
                                disabled={isDisintegrating || markNotificationReadMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markNotificationReadMutation.mutate(notification.id);
                                }}
                              >
                                {isDisintegrating ? (
                                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="mt-1">
                            <p className={`text-sm text-muted-foreground ${!isExpanded && shouldShowExpandButton ? 'line-clamp-2' : ''}`}>
                              {notification.message}
                            </p>
                            {shouldShowExpandButton && !isExpanded && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNotificationExpansion(notification.id);
                                }}
                                className="text-xs text-primary hover:underline mt-1 font-medium"
                              >
                                Ver más...
                              </button>
                            )}
                            {shouldShowExpandButton && isExpanded && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNotificationExpansion(notification.id);
                                }}
                                className="text-xs text-primary hover:underline mt-1 font-medium"
                              >
                                Ver menos
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                            {notification.repositionId && (
                              <Badge variant="outline" className="text-xs font-medium w-fit">
                                Reposición #{notification.repositionId}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          {notification.type === 'completion_approval_needed' && (
                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/50 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                                ⚠️ Solicitud de finalización pendiente de aprobación
                              </p>
                            </div>
                          )}
                          {notification.type === 'partial_transfer_warning' && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
                              <p className="text-xs text-red-800 dark:text-red-200 font-medium">
                                🚫 RESTRICCIÓN: No puedes pausar este pedido hasta recibir la orden completa
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pendingTransfers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-foreground">Transferencias Pendientes</h3>
                <Badge variant="secondary" className="text-xs">
                  {pendingTransfers.length}
                </Badge>
              </div>
              {pendingTransfers.map((transfer: any) => (
                <div
                  key={transfer.id}
                  className="relative overflow-hidden rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 transition-all duration-200 hover:shadow-md group"
                >
                  <div className="relative p-3 md:p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm leading-tight">
                          {transfer.pieces} piezas desde {getAreaDisplayName(transfer.fromArea)}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(transfer.createdAt)}
                        </p>
                        {transfer.notes && transfer.notes.trim() !== '' && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-foreground mb-1">Comentario del solicitante:</p>
                            <div className="bg-white p-2 rounded border-l-4 border-blue-400">
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words word-wrap break-all overflow-wrap-anywhere max-w-full">
                                {transfer.notes}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2 mt-3">
                          <Button
                            size="sm"
                            className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => acceptTransferMutation.mutate(transfer.id)}
                            disabled={acceptTransferMutation.isPending}
                          >
                            {acceptTransferMutation.isPending ? (
                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            )}
                            Aceptar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-3"
                            onClick={() => rejectTransferMutation.mutate(transfer.id)}
                            disabled={rejectTransferMutation.isPending}
                          >
                            {rejectTransferMutation.isPending ? (
                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notificaciones del sistema */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
              <h3 className="text-sm font-semibold text-foreground">Sistema</h3>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800 transition-all duration-200 hover:shadow-md group">
              <div className="relative p-3 md:p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm">Bienvenido a JASANA</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aquí verás notificaciones importantes del sistema
                    </p>

                  </div>
                </div>
              </div>
            </div>
          </div>

          {totalNotifications === 0 && (
            <div className="text-center py-12 md:py-16">
              <div className="relative">
                <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-green-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">¡Todo al día!</h3>
              <p className="text-sm text-muted-foreground">No tienes notificaciones pendientes</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}