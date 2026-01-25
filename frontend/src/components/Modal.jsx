import { useRef } from "react";

export default function Modal({
  isOpen,
  onClose,
  children,
  contentClassName = "modal",
  contentStyle,
}) {
  const backdropMouseDown = useRef(false);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        backdropMouseDown.current = event.target === event.currentTarget;
      }}
      onMouseUp={(event) => {
        if (backdropMouseDown.current && event.target === event.currentTarget) {
          onClose();
        }
        backdropMouseDown.current = false;
      }}
    >
      <div
        className={contentClassName}
        style={contentStyle}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}
