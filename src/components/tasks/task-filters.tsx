"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
type ProfileLite = { id: string; full_name: string; role?: string };

export interface TaskFilterState {
  assignee: string;
  category: string;
  priority: string;
  clientId: string;
}

interface Props {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  profiles: ProfileLite[];
  clients?: Array<{ id: string; company_name: string }>;
  showMine?: boolean;
  showClientFilter?: boolean;
}

export function TaskFilters({ filters, onChange, profiles, clients = [], showMine, showClientFilter }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.assignee} onValueChange={(v) => onChange({ ...filters, assignee: v })}>
        <SelectTrigger className="h-9 w-auto min-w-[140px]">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {showMine && <SelectItem value="mine">Minhas tarefas</SelectItem>}
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(v) => onChange({ ...filters, category: v })}>
        <SelectTrigger className="h-9 w-auto min-w-[140px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          <SelectItem value="onboarding">Onboarding</SelectItem>
          <SelectItem value="recurring_weekly">Semanal</SelectItem>
          <SelectItem value="recurring_monthly">Mensal</SelectItem>
          <SelectItem value="one_time">Avulsa</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => onChange({ ...filters, priority: v })}>
        <SelectTrigger className="h-9 w-auto min-w-[140px]">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas prioridades</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
        </SelectContent>
      </Select>

      {showClientFilter && clients.length > 0 && (
        <Select value={filters.clientId} onValueChange={(v) => onChange({ ...filters, clientId: v })}>
          <SelectTrigger className="h-9 w-auto min-w-[160px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
