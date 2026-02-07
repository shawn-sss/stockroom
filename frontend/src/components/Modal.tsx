import { useRef, type CSSProperties, type ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
  contentStyle?: CSSProperties;
};

export default function Modal({
  isOpen,
  onClose,
  children,
  contentClassName = "modal",
  contentStyle,
}: ModalProps) {
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
