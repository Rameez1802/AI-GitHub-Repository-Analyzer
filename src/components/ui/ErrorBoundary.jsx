import { Component } from 'react';

/** First line of an error stack that points into this project, e.g. "src/pages/Analysis.jsx:42:7". */
export function locationFromStack(stack) {
  for (const line of String(stack ?? '').split('\n').slice(1)) {
    if (line.includes('node_modules')) continue;
    const m = line.match(/(?:https?:\/\/[^/\s]+)?\/?((?:src|assets)\/[^\s?:)]+)(?:\?[^:)\s]*)?:(\d+):(\d+)/);
    if (m) return { file: m[1], line: Number(m[2]), column: Number(m[3]), text: `${m[1]}:${m[2]}:${m[3]}` };
  }
  return null;
}

export default class ErrorBoundary extends Component {
  state = { error: null, info: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('Interface error:', error, info?.componentStack);
  }

  copy = () => {
    const { error, info } = this.state;
    const text = `${error?.message}\nWhere: ${locationFromStack(error?.stack)?.text ?? 'unknown'}\n${info?.componentStack ?? ''}`;
    navigator.clipboard?.writeText(text);
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    const where = locationFromStack(error.stack);
    const component = info?.componentStack?.split('\n').find((l) => l.trim().startsWith('at '))?.trim().replace(/^at /, '');
    return (
      <div role="alert" className="mx-auto my-16 max-w-2xl rounded-3xl border border-line bg-white p-8">
        <p className="text-xs font-semibold tracking-wide text-muted">INTERFACE_ERROR</p>
        <h1 className="mt-1 text-2xl font-semibold">The page crashed</h1>
        <p className="mt-2 text-sm text-muted">{error.message}</p>
        <div className="mt-5 rounded-2xl bg-mist p-4 text-sm">
          <p className="font-semibold">Where</p>
          <p className="mt-1 break-all font-mono">{where ? where.text : 'Not available in a production build. Run npm run dev to see the file and line.'}</p>
          {component && <p className="mt-2 text-muted">In component: <span className="font-mono">{component}</span></p>}
        </div>
        <div className="mt-4 rounded-2xl bg-mist p-4 text-sm">
          <p className="font-semibold">How to resolve it</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">
            <li>Open the file and line shown above and look at what that line reads (often a value that is undefined).</li>
            <li>Check the browser console (F12) for the full error and component stack.</li>
            <li>If the data came from the server, check the server terminal for a matching error.</li>
          </ol>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => window.location.assign('/')} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white">
            Back to home
          </button>
          <button type="button" onClick={this.copy} className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-mist">
            Copy details
          </button>
        </div>
      </div>
    );
  }
}
