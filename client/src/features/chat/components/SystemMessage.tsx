interface SystemMessageProps {
  text: string;
}

export default function SystemMessage({ text }: SystemMessageProps) {
  return (
    <div className="py-1 text-center" role="status">
      <span className="text-xs text-gray-500 italic">{text}</span>
    </div>
  );
}
