interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {action}
    </div>
  );
}
