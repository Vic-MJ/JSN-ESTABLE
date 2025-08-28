
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bell, 
  LogOut, 
  User, 
  MessageSquare,
  Settings,
  Lightbulb,
  Clock,
  X
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useQuery } from "@tanstack/react-query";

interface TopBarProps {
  onShowNotifications: () => void;
}

export function TopBar({ onShowNotifications }: TopBarProps) {
  const { user, logoutMutation } = useAuth();
  const { theme } = useTheme();
  const [showProfile, setShowProfile] = useState(false);
  const [showUpdateAnnouncement, setShowUpdateAnnouncement] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const { data: pendingTransfers = [] } = useQuery<any[]>({
    queryKey: ["/api/transfers/pending"],
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: repositionNotifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch('/api/notifications', {
        credentials: 'include'
      });
      if (!res.ok) {
        console.error('Error fetching notifications:', res.status);
        return [];
      }
      const allNotifications = await res.json();
      const filteredNotifications = allNotifications.filter((n: any) => 
        !n.read && (
          n.type?.includes('reposition') || 
          n.type?.includes('completion') ||
          n.type === 'new_reposition' ||
          n.type === 'reposition_transfer' ||
          n.type === 'reposition_approved' ||
          n.type === 'reposition_rejected' ||
          n.type === 'reposition_completed' ||
          n.type === 'reposition_deleted' ||
          n.type === 'completion_approval_needed'
        )
      );
      return filteredNotifications;
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
      operaciones: "Operaciones",
      almacen: "Almacén",
      diseño: "Diseño"
    };
    return names[area] || area;
  };

  const getUserInitials = (name: string) => {
    if (!name) return "U";
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = {
      corte: "bg-[#10b981] text-white",
      bordado: "bg-[#3b82f6] text-white",
      ensamble: "bg-[#8b5cf6] text-white", 
      plancha: "bg-[#ec4899] text-white",
      calidad: "bg-[#6366f1] text-white",
      envios: "bg-[#8b5cf6] text-white",
      admin: "bg-[#64748b] text-white",
      operaciones: "bg-[#22c55e] text-white",
      almacen: "bg-[#f59e0b] text-white",
      diseño: "bg-[#a855f7] text-white"
    };
    return colors[area] || "bg-gray-400 text-white";
  };

  const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 6 && hour < 12) {
      return "Buenos días";
    } else if (hour >= 12 && hour < 19) {
      return "Buenas tardes";
    } else {
      return "Buenas noches";
    }
  };

  // Función para calcular tiempo restante hasta la actualización
  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetDate = new Date('2025-10-12T00:00:00');
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const totalNotifications = pendingTransfers.length + repositionNotifications.length;

  return (
    <>
      {/* Anuncio de próxima actualización */}
      {showUpdateAnnouncement && (
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white px-4 py-2 sticky top-0 z-50 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span className="font-semibold text-sm">
                    🚀 ¡Ayúdanos a mejorar!
                  </span>
                  <span className="text-xs sm:text-sm opacity-90">
                    Si tienes ideas que crees que podrían mejorar la aplicación, ¡háznolas saber!
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Contador regresivo */}
              <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
                <Clock className="w-4 h-4" />
                <div className="text-xs font-mono">
                  <span className="font-semibold">Próxima actualización:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span>{timeLeft.days}d</span>
                    <span>{timeLeft.hours}h</span>
                    <span>{timeLeft.minutes}m</span>
                    <span>{timeLeft.seconds}s</span>
                  </div>
                </div>
              </div>
              
              {/* Versión móvil del contador */}
              <div className="sm:hidden flex flex-col items-center bg-white/20 rounded px-2 py-1">
                <div className="text-xs font-semibold">12-09-2025</div>
                <div className="text-xs font-mono">
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpdateAnnouncement(false)}
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="h-16 border-b bg-[var(--jasana-topbar-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--jasana-topbar-bg)]/60 sticky top-0 z-40">
        <div className="flex h-full items-center justify-between px-6">
          {/* Información del usuario */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-500 via-pink-400 to-purple-700 bg-clip-text text-transparent">
                {getGreeting()}, {user?.name}
              </h1>
              <p className="text-xs text-muted-foreground">{user?.area ? getAreaDisplayName(user.area) : ''}</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3">
            {/* Botón de cambio de tema */}
            <ThemeToggle />
            
            {/* Botón de notificaciones */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowNotifications}
              className="relative h-10 w-10 p-0 hover:bg-gradient-to-r hover:from-[var(--jasana-accent)]/10 hover:to-[var(--jasana-primary)]/10"
            >
              <Bell className="h-5 w-5" />
              {totalNotifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {totalNotifications}
                </Badge>
              )}
            </Button>

            {/* Dropdown del usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-offset-background ring-primary/20">
                    <AvatarImage src="" alt={user?.name || ""} />
                    <AvatarFallback 
                      className={`font-semibold text-sm ${getAreaColor(user?.area || '')}`}
                    >
                      {getUserInitials(user?.name || "")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.username}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs px-2 py-0.5 w-fit ${getAreaColor(user?.area || '')}`}
                    >
                      {user?.area ? getAreaDisplayName(user.area) : ''}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowProfile(true)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`msteams:/l/chat/0/0?users=${user?.username}`} className="flex w-full">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Abrir Teams</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Modal de perfil */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Información del Perfil</DialogTitle>
            <DialogDescription>
              Detalles de tu cuenta en el sistema JASANA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Avatar y nombre */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-offset-4 ring-offset-background ring-primary/20">
                <AvatarImage src="" alt={user?.name || ""} />
                <AvatarFallback 
                  className={`font-bold text-lg ${getAreaColor(user?.area || '')}`}
                >
                  {getUserInitials(user?.name || "")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">@{user?.username}</p>
                <Badge 
                  className={`text-xs px-3 py-1 ${getAreaColor(user?.area || '')}`}
                >
                  {user?.area ? getAreaDisplayName(user.area) : ''}
                </Badge>
              </div>
            </div>

            {/* Información adicional */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Usuario</p>
                  <p className="text-sm">{user?.username}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Área</p>
                  <p className="text-sm">{user?.area ? getAreaDisplayName(user.area) : 'No asignada'}</p>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-3">Acciones Rápidas</p>
                <div className="space-y-2">
                  <a 
                    href={`msteams:/l/chat/0/0?users=${user?.username}`} 
                    className="block"
                  >
                    <Button size="sm" className="w-full justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Abrir Microsoft Teams
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
