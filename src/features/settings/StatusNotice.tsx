export function StatusNotice({
  message,
  action,
  onAction,
}: {
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="status-notice" role="status">
      <p>{message}</p>
      {onAction !== undefined && (
        <button type="button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
