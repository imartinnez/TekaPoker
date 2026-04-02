/**
 * Diálogo de confirmación — bottom-sheet modal para acciones destructivas.
 *
 * Props:
 *   title        {string}  — título del diálogo
 *   description  {string}  — descripción adicional (opcional)
 *   confirmLabel {string}  — texto del botón de confirmar (por defecto "Confirmar")
 *   onConfirm    {fn}      — acción a ejecutar al confirmar
 *   onCancel     {fn}      — acción a ejecutar al cancelar
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">{title}</p>
        {description && <p className="modal-desc">{description}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
