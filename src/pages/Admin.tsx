import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, LogOut, Trash2, Plus, RefreshCw } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Admin = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("admin_token");

  const [stats, setStats] = useState<{ source: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [sources, setSources] = useState<{ id: number; name: string; url: string; type: string }[]>([]);
  const [collecting, setCollecting] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [newSource, setNewSource] = useState({ name: "", url: "", type: "rss" });

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Проверка авторизации
  useEffect(() => {
    if (!token) navigate("/admin/login");
  }, [token, navigate]);

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/admin/stats`, { headers: authHeaders });
    if (res.status === 401) { navigate("/admin/login"); return; }
    const data = await res.json();
    setStats(data.stats);
    setTotal(data.total);
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await fetch(`${API}/admin/logs`, { headers: authHeaders });
    const data = await res.json();
    setLogs(data.logs);
  }, []);

  const fetchSources = useCallback(async () => {
    const res = await fetch(`${API}/admin/sources`, { headers: authHeaders });
    const data = await res.json();
    setSources(data.sources);
  }, []);

  const fetchCollectStatus = useCallback(async () => {
    const res = await fetch(`${API}/admin/collect/status`, { headers: authHeaders });
    const data = await res.json();
    setCollecting(data.running);
    setLastRun(data.last_run);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchSources();
    fetchCollectStatus();
  }, []);

  // Обновляем статус сбора каждые 3 секунды если запущен
  useEffect(() => {
    if (!collecting) return;
    const interval = setInterval(async () => {
      await fetchCollectStatus();
      await fetchLogs();
      if (!collecting) {
        await fetchStats();
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [collecting]);

  const handleCollect = async () => {
    await fetch(`${API}/admin/collect`, { method: "POST", headers: authHeaders });
    setCollecting(true);
  };

  const handleLogout = async () => {
    await fetch(`${API}/admin/logout`, { method: "POST", headers: authHeaders });
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const handleAddSource = async () => {
    if (!newSource.name || !newSource.url) return;
    await fetch(`${API}/admin/sources`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(newSource),
    });
    setNewSource({ name: "", url: "", type: "rss" });
    fetchSources();
  };

  const handleDeleteSource = async (id: number) => {
    await fetch(`${API}/admin/sources/${id}`, { method: "DELETE", headers: authHeaders });
    fetchSources();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Панель администратора</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              На главную
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">

        {/* Запуск сбора */}
        <Card>
          <CardHeader>
            <CardTitle>Сбор статей</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <Button onClick={handleCollect} disabled={collecting}>
                {collecting
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Сбор идёт...</>
                  : <><Play className="w-4 h-4 mr-2" /> Запустить сбор</>
                }
              </Button>
              {lastRun && (
                <span className="text-sm text-muted-foreground">
                  Последний запуск: {new Date(lastRun).toLocaleString("ru-RU")}
                </span>
              )}
            </div>

            {/* Логи */}
            {logs.length > 0 && (
              <div className="bg-muted rounded-md p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={log.includes("ERROR") ? "text-destructive" : "text-foreground"}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Статистика */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Статистика по источникам</CardTitle>
            <span className="text-sm text-muted-foreground">Всего: {total} статей</span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((s) => (
                <div key={s.source} className="flex justify-between items-center border rounded-md px-3 py-2">
                  <span className="text-sm font-medium truncate">{s.source}</span>
                  <Badge variant="secondary">{s.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Управление источниками */}
        <Card>
          <CardHeader>
            <CardTitle>Управление источниками</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Форма добавления */}
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Name"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                className="w-40"
              />
              <Input
                placeholder="URL"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                className="flex-1 min-w-48"
              />
              <select
                value={newSource.type}
                onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="rss">RSS</option>
                <option value="html">HTML</option>
              </select>
              <Button onClick={handleAddSource}>
                <Plus className="w-4 h-4 mr-1" /> Добавить
              </Button>
            </div>

            {/* Список источников */}
            <div className="space-y-2">
              {sources.map((s) => (
                <div key={s.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={s.type === "rss" ? "default" : "secondary"}>{s.type.toUpperCase()}</Badge>
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{s.url}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSource(s.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {sources.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Источники не добавлены
                </p>
              )}
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
};

export default Admin;