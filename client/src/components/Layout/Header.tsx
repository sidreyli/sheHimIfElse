import AccessibilityToolbar from './AccessibilityToolbar';

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-surface-700 bg-surface-800 px-4 py-2">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">
          <span className="text-accent-primary">Sign</span>Connect
        </h1>
      </div>
      <AccessibilityToolbar />
    </header>
  );
}
