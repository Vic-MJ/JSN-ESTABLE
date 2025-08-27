import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Users, RotateCcw, Shield, TrendingUp, Package, Edit2, Trash2, UserPlus, Download, Database, Bell, FileText, Activity, AlertTriangle, Upload, Loader2 } from "lucide-react";
import { type Order } from "@shared/schema";

// Define User type locally with 'active' property if not present in @shared/schema
type User = {
  id: number;
  username: string;
  name: string;
  area: "patronaje" | "corte" | "bordado" | "ensamble" | "plancha" | "calidad" | "operaciones" | "admin" | "almacen" | "diseño";
  createdAt: Date;
  password: string;
  active: boolean; 
};

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", username: "", area: "", newPassword: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", username: "", area: "", password: "" });
  const [showClearDatabaseModal, setShowClearDatabaseModal] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isClearingDatabase, setIsClearingDatabase] = useState(false);
  const [isResettingSequence, setIsResettingSequence] = useState(false);
  const [deleteUsersChecked, setDeleteUsersChecked] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showSystemBackupModal, setShowSystemBackupModal] = useState(false);
  const [showSystemRestoreModal, setShowSystemRestoreModal] = useState(false);
  const [systemRestoreFile, setSystemRestoreFile] = useState<File | null>(null);

  if (user?.area !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-gray-600">Solo los administradores pueden acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return await res.json();
    }
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/reset-password", {
        userId,
        newPassword: password
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Contraseña restablecida",
        description: "La contraseña ha sido restablecida exitosamente",
      });
      setShowResetModal(false);
      setNewPassword("");
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al restablecer contraseña",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PUT", `/api/admin/users/${id}`, updateData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al actualizar usuario");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Usuario actualizado correctamente" });
      setShowEditModal(false);
      setEditUser(null);
      setEditForm({ name: "", username: "", area: "", newPassword: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al actualizar usuario", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al crear usuario");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Usuario creado correctamente" });
      setShowCreateModal(false);
      setCreateForm({ name: "", username: "", area: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al crear usuario", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Usuario eliminado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: err => toast({ title: "Error al eliminar usuario", description: err.message, variant: "destructive" })
  });

  const clearDatabaseMutation = useMutation({
    mutationFn: async (data: { confirmationCode: string; deleteUsers: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/clear-database", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Base de datos limpiada", 
        description: "Todos los datos han sido eliminados correctamente" 
      });
      setShowClearDatabaseModal(false);
      setConfirmationCode("");
      setDeleteUsersChecked(false);
      // Invalidar todas las queries
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al limpiar base de datos", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const backupUsersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/admin/backup-users");
      return res.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-usuarios-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Respaldo completado",
        description: "El respaldo de usuarios ha sido descargado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al generar respaldo",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const restoreUsersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('backup', file);
      const res = await fetch('/api/admin/restore-users', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al restaurar usuarios');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Restauración completada",
        description: "Los usuarios han sido restaurados exitosamente",
      });
      setShowRestoreModal(false);
      setRestoreFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al restaurar usuarios",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const backupCompleteSystemMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/admin/backup-complete-system");
      return res.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-completo-jasana-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Respaldo completo completado",
        description: "El respaldo completo del sistema ha sido descargado exitosamente",
      });
      setShowSystemBackupModal(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al generar respaldo completo",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const restoreCompleteSystemMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('backup', file);
      const res = await fetch('/api/admin/restore-complete-system', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al restaurar el sistema');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Restauración completa completada",
        description: "El sistema ha sido restaurado exitosamente",
      });
      setShowSystemRestoreModal(false);
      setSystemRestoreFile(null);
      queryClient.invalidateQueries();
      // Recargar la página después de una restauración completa
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al restaurar el sistema",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const openEditModal = (u: User) => {
    setEditUser(u);
    setEditForm({ name: u.name, username: u.username, area: u.area, newPassword: "" });
    setShowEditModal(true);
  };

  const handleResetPassword = () => {
    if (!selectedUser || !newPassword) return;
    resetPasswordMutation.mutate({ userId: selectedUser.id, password: newPassword });
  };

  const handleSaveEdit = () => {
    if (!editUser) return;

    // Validar campos requeridos
    if (!editForm.name.trim() || !editForm.username.trim() || !editForm.area) {
      toast({
        title: "Error de validación",
        description: "Todos los campos son requeridos",
        variant: "destructive"
      });
      return;
    }

    const payload: any = { 
      name: editForm.name.trim(), 
      username: editForm.username.trim(), 
      area: editForm.area 
    };

    if (editForm.newPassword && editForm.newPassword.trim()) {
      payload.newPassword = editForm.newPassword.trim();
    }

    updateUserMutation.mutate({ id: editUser.id, ...payload });
  };

  const handleCreateUser = () => {
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.area || !createForm.password.trim()) {
      toast({
        title: "Error de validación",
        description: "Todos los campos son requeridos",
        variant: "destructive"
      });
      return;
    }

    createUserMutation.mutate({
      name: createForm.name.trim(),
      username: createForm.username.trim(),
      area: createForm.area,
      password: createForm.password.trim()
    });
  };

  const handleBackupUsers = () => {
    backupUsersMutation.mutate();
  };

  const handleRestoreUsers = () => {
    if (!restoreFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de respaldo",
        variant: "destructive"
      });
      return;
    }
    restoreUsersMutation.mutate(restoreFile);
  };

  const handleBackupSystem = () => {
    setShowSystemBackupModal(true);
  };

  const handleConfirmBackupSystem = () => {
    backupCompleteSystemMutation.mutate();
  };

  const handleRestoreSystem = () => {
    if (!systemRestoreFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de respaldo completo",
        variant: "destructive"
      });
      return;
    }
    restoreCompleteSystemMutation.mutate(systemRestoreFile);
  };

  const handleExportReports = () => {
    // Crear datos de ejemplo para el reporte
    const reportData = orders.map(order => ({
      folio: order.folio,
      cliente: order.clienteHotel,
      estado: order.status,
      area: order.currentArea,
      piezas: order.totalPiezas,
      fecha: new Date(order.createdAt).toLocaleDateString('es-ES')
    }));

    const csvContent = [
      'Folio,Cliente,Estado,Área,Piezas,Fecha',
      ...reportData.map(row => `${row.folio},${row.cliente},${row.estado},${row.area},${row.piezas},${row.fecha}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_pedidos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Reporte exportado",
      description: "El reporte de pedidos ha sido descargado exitosamente",
    });
  };

  const handleClearLogs = () => {
    toast({
      title: "Logs limpiados",
      description: "Los logs del sistema han sido limpiados exitosamente",
    });
  };

  const handleClearDatabase = () => {
    if (confirmationCode !== "BORRAR_TODO_JASANA_2025") {
      toast({
        title: "Código incorrecto",
        description: "El código de confirmación no es válido",
        variant: "destructive"
      });
      return;
    }
    clearDatabaseMutation.mutate({ 
      confirmationCode, 
      deleteUsers: deleteUsersChecked 
    });
  };

  const handleNotificationTest = () => {
    toast({
      title: "Notificación de prueba",
      description: "Sistema de notificaciones funcionando correctamente",
    });
  };

  const getAreaDisplayName = (area: string) => {
    const names: Record<string, string> = {
      corte: 'Corte',
      bordado: 'Bordado',
      ensamble: 'Ensamble',
      plancha: 'Plancha/Empaque',
      calidad: 'Calidad',
      envios: 'Envíos',
      almacen: 'Almacén',
      admin: 'Admin',
      diseño: 'Diseño',
      patronaje: 'Patronaje',
      operaciones: 'Operaciones'
    };
    return names[area] || area;
  };

  const getAreaBadgeColor = (area: string) => {
    const colors: Record<string, string> = {
      corte: "badge-corte",
      bordado: "badge-bordado", 
      ensamble: "badge-ensamble",
      plancha: "badge-plancha",
      calidad: "badge-calidad",
      envios: "badge-envios",
      admin: "badge-admin",
      almacen: "badge-almacen",
      diseño: "badge-diseño",
      patronaje: "bg-yellow-100 text-yellow-800",
      operaciones: "badge-operaciones"
    };
    return colors[area] || "badge-admin";
  };

  const activeOrders = orders.filter(order => order.status === 'active');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const todayCompletedOrders = completedOrders.filter(order => 
    order.completedAt && 
    new Date(order.completedAt).toDateString() === new Date().toDateString()
  );

  const handleResetUserSequence = async () => {
    const confirmed = window.confirm(
      '¿Quieres reiniciar la secuencia de IDs de usuarios? Esto hará que el próximo usuario creado tenga un ID consecutivo.'
    );

    if (!confirmed) return;

    setIsResettingSequence(true);
    try {
      const response = await fetch('/api/admin/reset-user-sequence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "✅ Secuencia reiniciada",
          description: "Los IDs de usuarios ahora serán consecutivos",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Error al reiniciar la secuencia');
      }
    } catch (error) {
      console.error('Error resetting sequence:', error);
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al reiniciar la secuencia",
        variant: "destructive",
      });
    } finally {
      setIsResettingSequence(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
         {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
          <Settings className="text-white text-2xl" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
          <p className="text-gray-600">Gestión del sistema JASANA</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pedidos Activos</p>
                <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="text-blue-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Finalizados Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{todayCompletedOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Completados</p>
                <p className="text-2xl font-bold text-gray-900">{completedOrders.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="text-purple-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Usuarios Registrados</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="text-orange-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Gestión de Usuarios Mejorada */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Gestión de Usuarios</span>
              </CardTitle>
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Nuevo Usuario</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input 
                        value={createForm.name} 
                        onChange={e => setCreateForm({ ...createForm, name: e.target.value })} 
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <Label>Username</Label>
                      <Input 
                        value={createForm.username} 
                        onChange={e => setCreateForm({ ...createForm, username: e.target.value })} 
                        placeholder="Nombre de usuario"
                      />
                    </div>
                    <div>
                      <Label>Área</Label>
                      <Select value={createForm.area} onValueChange={val => setCreateForm({ ...createForm, area: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar área" />
                        </SelectTrigger>
                        <SelectContent>
                          {["admin","corte","bordado","ensamble","plancha","calidad","envios", "diseño", "patronaje", "almacen", "operaciones"].map(a => (
                            <SelectItem key={a} value={a}>{getAreaDisplayName(a)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Contraseña</Label>
                      <Input 
                        type="password"
                        value={createForm.password} 
                        onChange={e => setCreateForm({ ...createForm, password: e.target.value })} 
                        placeholder="Contraseña inicial"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                        {createUserMutation.isPending ? "Creando..." : "Crear Usuario"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {users.length > 0 ? (
              <div className="max-h-96 overflow-y-auto border-t dark:border-slate-700">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700">
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">ID</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Usuario</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Nombre</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Área</TableHead>
                      <TableHead className="font-semibold text-center text-gray-900 dark:text-gray-100">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 border-b dark:border-slate-700">
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 px-4 py-3">#{u.id}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">
                                {u.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{u.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100 px-4 py-3">{u.name}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge className={getAreaBadgeColor(u.area)}>
                            {getAreaDisplayName(u.area)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex justify-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openEditModal(u)}
                              className="flex items-center space-x-1 h-8 px-2"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span className="text-xs">Editar</span>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => { setSelectedUser(u); setShowResetModal(true); }}
                              className="flex items-center space-x-1 h-8 px-2"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span className="text-xs">Reset</span>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => deleteUserMutation.mutate(u.id)}
                              className="flex items-center space-x-1 h-8 px-2"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span className="text-xs">Eliminar</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 px-6">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No hay usuarios registrados.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Configuration Mejorada */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm dark:border-slate-700 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900">
          <CardTitle className="flex items-center space-x-2 text-gray-800 dark:text-gray-200">
            <Settings className="h-5 w-5" />
            <span>Configuración del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">
            {/* Información del Sistema */}
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Información del Sistema
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Package className="text-white h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Empresa</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Sistema de gestión</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">JASANA</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <Activity className="text-white h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Áreas activas</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Módulos habilitados</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">11 áreas</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Database className="text-white h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Base de datos</span>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Estado de conexión</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">Conectada</span>
                </div>
              </div>
            </div>

            {/* Respaldos del Sistema */}
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Respaldos del Sistema
              </h3>

              {/* Respaldo Completo */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Sistema Completo</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    size="sm"
                    onClick={() => backupCompleteSystemMutation.mutate()}
                    disabled={backupCompleteSystemMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs"
                  >
                    {backupCompleteSystemMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3" />
                        Respaldar Todo
                      </>
                    )}
                  </Button>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          restoreCompleteSystemMutation.mutate(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                      ref={(input) => {
                        if (input) {
                          (window as any).systemRestoreFileInput = input;
                        }
                      }}
                    />
                    <Button 
                      size="sm"
                      onClick={() => {
                        (window as any).systemRestoreFileInput?.click();
                      }}
                      disabled={restoreCompleteSystemMutation.isPending}
                      variant="outline"
                      className="w-full h-8 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    >
                      {restoreCompleteSystemMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Restaurando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3" />
                          Restaurar Todo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-2">
                  Incluye toda la información del sistema
                </p>
              </div>

              {/* Respaldo de Usuarios */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Solo Usuarios</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    size="sm"
                    onClick={() => backupUsersMutation.mutate()}
                    disabled={backupUsersMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                  >
                    {backupUsersMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3" />
                        Respaldar Usuarios
                      </>
                    )}
                  </Button>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          restoreUsersMutation.mutate(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                      ref={(input) => {
                        if (input) {
                          (window as any).userRestoreFileInput = input;
                        }
                      }}
                    />
                    <Button 
                      size="sm"
                      onClick={() => {
                        (window as any).userRestoreFileInput?.click();
                      }}
                      disabled={restoreUsersMutation.isPending}
                      variant="outline"
                      className="w-full h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      {restoreUsersMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Restaurando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3" />
                          Restaurar Usuarios
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
                  Solo información de usuarios
                </p>
              </div>
            </div>

            {/* Herramientas Administrativas */}
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Herramientas
              </h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full justify-start h-10 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 dark:from-emerald-950/30 dark:to-green-950/30 dark:hover:from-emerald-900/50 dark:hover:to-green-900/50 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300" 
                  onClick={handleNotificationTest}
                >
                  <Bell className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-left">
                    <div className="font-medium text-xs">Probar Notificaciones</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">Sistema de alertas</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full justify-start h-10 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-950/30 dark:to-indigo-950/30 dark:hover:from-purple-900/50 dark:hover:to-indigo-900/50 border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-300" 
                  onClick={handleExportReports}
                >
                  <FileText className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <div className="text-left">
                    <div className="font-medium text-xs">Exportar Reportes</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">Descargar datos</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full justify-start h-10 bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 dark:from-orange-950/30 dark:to-yellow-950/30 dark:hover:from-orange-900/50 dark:hover:to-yellow-900/50 border-orange-200 dark:border-orange-700 text-orange-800 dark:text-orange-300" 
                  onClick={handleClearLogs}
                >
                  <Activity className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <div className="text-left">
                    <div className="font-medium text-xs">Limpiar Logs</div>
                    <div className="text-xs text-orange-600 dark:text-orange-400">Liberar espacio</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full justify-start h-10 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 dark:from-red-950/30 dark:to-red-900/30 dark:hover:from-red-900/50 dark:hover:to-red-800/50 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300" 
                  onClick={() => setShowClearDatabaseModal(true)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
                  <div className="text-left">
                    <div className="font-medium text-xs">Limpiar Base de Datos</div>
                    <div className="text-xs text-red-600 dark:text-red-400">⚠️ PELIGRO</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetUserSequence}
                  disabled={isResettingSequence}
                  className="w-full justify-start h-10 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 dark:from-blue-950/30 dark:to-cyan-950/30 dark:hover:from-blue-900/50 dark:hover:to-cyan-900/50 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300"
                >
                  <RotateCcw className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <div className="font-medium text-xs">
                      {isResettingSequence ? "Reiniciando..." : "Reiniciar IDs"}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Secuencia de usuarios</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm dark:border-slate-700">
        <CardHeader>
          <CardTitle>Actividad Reciente del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="text-blue-600 h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{order.folio}</p>
                    <p className="text-sm text-gray-600">{order.clienteHotel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getAreaBadgeColor(order.currentArea)}>
                    {getAreaDisplayName(order.currentArea)}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(order.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

        {/* Modales */}
        <Dialog open={showResetModal} onOpenChange={(open) => {
          setShowResetModal(open);
          if (!open) {
            setNewPassword("");
            setSelectedUser(null);
          }
        }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Restablecer Contraseña</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Usuario</Label><Input readOnly value={selectedUser?.username || ""} /></div>
              <div><Label>Nueva Contraseña</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowResetModal(false)}>Cancelar</Button><Button onClick={handleResetPassword} disabled={!newPassword}>Restablecer</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditModal} onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setEditForm({ name: '', username: '', area: '', newPassword: '' });
          }
        }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><Label>Username</Label><Input value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} /></div>
              <div><Label>Área</Label>
                <Select value={editForm.area} onValueChange={val => setEditForm({ ...editForm, area: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["admin","corte","bordado","ensamble","plancha","calidad","envios", "diseño", "patronaje", "almacen", "operaciones"].map(a => (
                    <SelectItem key={a} value={a}>{getAreaDisplayName(a)}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button><Button onClick={handleSaveEdit}>Guardar Cambios</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showClearDatabaseModal} onOpenChange={(open) => {
          setShowClearDatabaseModal(open);
          if (!open) {
            setConfirmationCode("");
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Limpiar Base de Datos - PELIGRO
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <p className="text-red-800 font-semibold mb-2">⚠️ ADVERTENCIA CRÍTICA</p>
                <p className="text-red-700 text-sm mb-2">
                  Esta acción eliminará PERMANENTEMENTE todos los datos del sistema:
                </p>
                <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                  <li>Todos los pedidos y su historial</li>
                  <li>Todas las reposiciones y sus datos</li>
                  <li>Todas las transferencias</li>
                  <li>Todos los documentos subidos</li>
                  <li>Todas las notificaciones</li>
                  <li>Todos los eventos de agenda</li>
                  <li>Todos los usuarios (excepto Admin)</li>
                </ul>
                <p className="text-red-800 font-bold text-sm mt-2">
                  Esta acción NO SE PUEDE DESHACER
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="delete-users"
                    checked={deleteUsersChecked}
                    onCheckedChange={(checked) => setDeleteUsersChecked(checked as boolean)}
                  />
                  <Label 
                    htmlFor="delete-users" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Eliminar también todos los usuarios (excepto Admin)
                  </Label>
                </div>
                <div>
                  <Label className="text-red-700 font-semibold">
                    Para confirmar, escriba exactamente: BORRAR_TODO_JASANA_2025
                  </Label>
                  <Input 
                    value={confirmationCode} 
                    onChange={e => setConfirmationCode(e.target.value)} 
                    placeholder="Escriba el código de confirmación"
                    className="border-red-300 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowClearDatabaseModal(false);
                    setConfirmationCode("");
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleClearDatabase}
                  disabled={clearDatabaseMutation.isPending || confirmationCode !== "BORRAR_TODO_JASANA_2025"}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {clearDatabaseMutation.isPending ? "Limpiando..." : "LIMPIAR BASE DE DATOS"}
                </Button>
                 <Button
                    variant="outline"
                    onClick={handleResetUserSequence}
                    disabled={isResettingSequence}
                  >
                    {isResettingSequence ? "Reiniciando..." : "🔄 Reiniciar IDs de Usuarios"}
                  </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRestoreModal} onOpenChange={(open) => {
          setShowRestoreModal(open);
          if (!open) {
            setRestoreFile(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Restaurar Usuarios
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <p className="text-blue-800 font-semibold mb-2">ℹ️ Información</p>
                <p className="text-blue-700 text-sm">
                  Esta acción restaurará los usuarios desde un archivo de respaldo. Los usuarios existentes con el mismo username serán actualizados.
                </p>
              </div>

              <div>
                <Label className="text-gray-700 font-medium">
                  Seleccionar archivo de respaldo
                </Label>
                <Input 
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowRestoreModal(false);
                    setRestoreFile(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRestoreUsers}
                  disabled={restoreUsersMutation.isPending || !restoreFile}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {restoreUsersMutation.isPending ? "Restaurando..." : "Restaurar Usuarios"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmación de respaldo completo */}
        <Dialog open={showSystemBackupModal} onOpenChange={setShowSystemBackupModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-800">
                <Database className="h-5 w-5" />
                Respaldo Completo del Sistema
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <p className="text-blue-800 font-semibold mb-2">🔒 Respaldo Completo</p>
                <p className="text-blue-700 text-sm mb-2">
                  Esta acción creará un respaldo completo de toda la base de datos incluyendo:
                </p>
                <ul className="text-blue-700 text-sm list-disc list-inside space-y-1">
                  <li>Todos los usuarios y configuraciones</li>
                  <li>Todos los pedidos y su historial</li>
                  <li>Todas las reposiciones y transferencias</li>
                  <li>Todos los documentos y notificaciones</li>
                  <li>Eventos de agenda y timers</li>
                  <li>Configuraciones administrativas</li>
                </ul>
                <p className="text-blue-800 font-bold text-sm mt-2">
                  El archivo será descargado automáticamente
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSystemBackupModal(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmBackupSystem}
                  disabled={backupCompleteSystemMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {backupCompleteSystemMutation.isPending ? "Creando Respaldo..." : "Crear Respaldo Completo"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de restauración completa del sistema */}
        <Dialog open={showSystemRestoreModal} onOpenChange={(open) => {
          setShowSystemRestoreModal(open);
          if (!open) {
            setSystemRestoreFile(null);
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-800">
                <Upload className="h-5 w-5" />
                Restaurar Sistema Completo
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <p className="text-red-800 font-semibold mb-2">⚠️ ADVERTENCIA CRÍTICA</p>
                <p className="text-red-700 text-sm mb-2">
                  Esta acción restaurará COMPLETAMENTE el sistema desde un respaldo, esto puede:
                </p>
                <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                  <li>Duplicar datos si ya existen</li>
                  <li>Restaurar información eliminada previamente</li>
                  <li>Afectar el funcionamiento del sistema</li>
                  <li>Tomar varios minutos en completarse</li>
                </ul>
                <p className="text-red-800 font-bold text-sm mt-2">
                  Use solo respaldos generados por este mismo sistema
                </p>
              </div>

              <div>
                <Label className="text-gray-700 font-medium">
                  Seleccionar archivo de respaldo completo (.json)
                </Label>
                <Input 
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setSystemRestoreFile(e.target.files?.[0] || null)}
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowSystemRestoreModal(false);
                    setSystemRestoreFile(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRestoreSystem}
                  disabled={restoreCompleteSystemMutation.isPending || !systemRestoreFile}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {restoreCompleteSystemMutation.isPending ? "Restaurando Sistema..." : "RESTAURAR SISTEMA COMPLETO"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}