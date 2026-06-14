import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Category } from "@shared/schema";

interface Props {
  category: Category;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}

export function SortableCategoryRow({ category, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      type="button"
      className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none flex-shrink-0"
      aria-label="Drag to reorder"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}
