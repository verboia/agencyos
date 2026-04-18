"use client";

import { useState, useTransition } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "./task-card";
import { TaskFilters } from "./task-filters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { updateTaskStatus } from "@/app/(dashboard)/tasks/actions";
import { CreateTaskDialog } from "./create-task-dialog";
import type { Task, TaskStatus } from "@/types/database";
type ProfileLite = { id: string; full_name: string; role?: string };

type TaskWithRelations = Task & {
  assigned_profile?: { full_name: string } | null;
  client?: { company_name: string } | null;
};

const COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: "pending", label: "Pendente" },
  { id: "in_progress", label: "Em andamento" },
  { id: "blocked", label: "Bloqueada" },
  { id: "done", label: "Concluída" },
];

interface Props {
  tasks: TaskWithRelations[];
  profiles: ProfileLite[];
  clientId?: string;
  clients?: Array<{ id: string; company_name: string }>;
  currentUserId?: string;
  showClient?: boolean;
}

export function KanbanBoard({ tasks: initialTasks, profiles, clientId, clients = [], currentUserId, showClient = true }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filters, setFilters] = useState({
    assignee: "all",
    category: "all",
    priority: "all",
    clientId: "all",
  });
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = tasks.filter((t) => {
    if (filters.assignee === "mine" && t.assigned_to !== currentUserId) return false;
    if (filters.assignee !== "all" && filters.assignee !== "mine" && t.assigned_to !== filters.assignee) return false;
    if (filters.category !== "all" && t.category !== filters.category) return false;
    if (filters.priority !== "all" && t.priority !== filters.priority) return false;
    if (filters.clientId !== "all" && t.client_id !== filters.clientId) return false;
    return true;
  });

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null } : t))
    );

    startTransition(async () => {
      await updateTaskStatus(taskId, newStatus);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          profiles={profiles}
          clients={clients}
          showMine={!!currentUserId}
          showClientFilter={!clientId}
        />
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.id);
            return (
              <Card key={col.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{col.label}</span>
                    <span className="text-muted-foreground text-xs font-normal">{colTasks.length}</span>
                  </CardTitle>
                </CardHeader>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 min-h-[300px] space-y-2 p-3 pt-0 ${snapshot.isDraggingOver ? "bg-accent/50" : ""}`}
                    >
                      {colTasks.map((task, idx) => (
                        <Draggable key={task.id} draggableId={task.id} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                ...dragProvided.draggableProps.style,
                                opacity: dragSnapshot.isDragging ? 0.8 : 1,
                              }}
                            >
                              <TaskCard task={task} showClient={showClient} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {colTasks.length === 0 && (
                        <div className="text-xs text-muted-foreground text-center py-6">
                          Nenhuma tarefa
                        </div>
                      )}
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            );
          })}
        </div>
      </DragDropContext>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        profiles={profiles}
        clients={clients}
        clientId={clientId}
        onCreated={(task) => setTasks((prev) => [...prev, task as TaskWithRelations])}
      />
    </div>
  );
}
