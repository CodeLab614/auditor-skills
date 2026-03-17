"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Monitor,
  Smartphone,
  Laptop,
  Globe,
  MapPin,
  Clock,
  LogOut,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { revokeSession, revokeAllOtherSessions } from "@/actions/sessions";

export interface SessionData {
  id: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface ActiveSessionsProps {
  sessions: SessionData[];
  currentSessionToken?: string;
  onSessionRevoked?: () => void;
}

function getDeviceInfo(userAgent: string | null): {
  type: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return { type: "desktop", browser: "Unknown", os: "Unknown" };
  }

  const ua = userAgent.toLowerCase();

  // Detect device type
  let type: "desktop" | "mobile" | "tablet" = "desktop";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    type = "mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    type = "tablet";
  }

  // Detect browser
  let browser = "Unknown";
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

  // Detect OS
  let os = "Unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  return { type, browser, os };
}

function DeviceIcon({ type }: { type: "desktop" | "mobile" | "tablet" }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="h-5 w-5" strokeWidth={1.5} />;
    case "tablet":
      return <Laptop className="h-5 w-5" strokeWidth={1.5} />;
    default:
      return <Monitor className="h-5 w-5" strokeWidth={1.5} />;
  }
}

function SessionItem({
  session,
  onRevoke,
  isRevoking,
}: {
  session: SessionData;
  onRevoke: (sessionId: string) => Promise<void>;
  isRevoking: boolean;
}) {
  const deviceInfo = getDeviceInfo(session.userAgent);
  const isExpired = new Date(session.expiresAt) < new Date();

  return (
    <div
      className={`flex items-start gap-4 p-4 border border-border rounded-lg ${
        session.isCurrent ? "bg-primary/5 border-primary/20" : ""
      }`}
    >
      <div
        className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${
          session.isCurrent
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        <DeviceIcon type={deviceInfo.type} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">
            {deviceInfo.browser} en {deviceInfo.os}
          </p>
          {session.isCurrent && (
            <Badge variant="default" className="text-xs">
              Sesión actual
            </Badge>
          )}
          {isExpired && (
            <Badge variant="destructive" className="text-xs">
              Expirada
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
          {session.ipAddress && session.ipAddress !== "unknown" && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              {session.ipAddress === "::1" ||
              session.ipAddress === "127.0.0.1" ||
              session.ipAddress.startsWith("0000:0000")
                ? "localhost"
                : session.ipAddress}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
            Iniciada{" "}
            {formatDistanceToNow(new Date(session.createdAt), {
              addSuffix: true,
              locale: es,
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
            Expira{" "}
            {formatDistanceToNow(new Date(session.expiresAt), {
              addSuffix: true,
              locale: es,
            })}
          </span>
        </div>
      </div>

      {!session.isCurrent && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isRevoking}
            >
              {isRevoking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cerrar sesión remota</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que deseas cerrar esta sesión? El dispositivo
                será desconectado inmediatamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onRevoke(session.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Cerrar sesión
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export function ActiveSessions({
  sessions,
  currentSessionToken,
  onSessionRevoked,
}: ActiveSessionsProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [localSessions, setLocalSessions] = React.useState(sessions);

  React.useEffect(() => {
    setLocalSessions(sessions);
  }, [sessions]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    const result = await revokeSession(sessionId);

    if (result.response === 'error') {
      toast.error(result.message);
      setRevokingId(null);
      return;
    }

    setLocalSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success(result.message);
    onSessionRevoked?.();
    setRevokingId(null);
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!currentSessionToken) {
      toast.error("No se pudo identificar la sesión actual");
      return;
    }

    setIsLoading(true);
    const result = await revokeAllOtherSessions(currentSessionToken);

    if (result.response === 'error') {
      toast.error(result.message);
      setIsLoading(false);
      return;
    }

    setLocalSessions((prev) => prev.filter((s) => s.isCurrent));
    toast.success(result.message);
    onSessionRevoked?.();
    setIsLoading(false);
  };

  const otherSessionsCount = localSessions.filter((s) => !s.isCurrent).length;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium mb-1">Sesiones Activas</h3>
          <p className="text-sm text-muted-foreground">
            Administra tus sesiones activas en todos los dispositivos.
          </p>
        </div>
        {otherSessionsCount > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldAlert className="h-4 w-4 mr-2" strokeWidth={1.5} />
                )}
                Cerrar otras sesiones
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cerrar todas las otras sesiones</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro de que deseas cerrar todas las sesiones excepto la
                  actual? Esto desconectará {otherSessionsCount}{" "}
                  {otherSessionsCount === 1 ? "dispositivo" : "dispositivos"}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRevokeAllOtherSessions}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Cerrar todas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="space-y-3">
        {localSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-sm">No hay sesiones activas.</p>
          </div>
        ) : (
          localSessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              onRevoke={handleRevokeSession}
              isRevoking={revokingId === session.id}
            />
          ))
        )}
      </div>

      {localSessions.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          {localSessions.length}{" "}
          {localSessions.length === 1 ? "sesión activa" : "sesiones activas"} en
          total
        </p>
      )}
    </Card>
  );
}
