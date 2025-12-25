import "./MermaidEditor.css";
import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import CodeMirror from "codemirror";

import "codemirror/lib/codemirror.css";
import "codemirror/theme/material-darker.css";
import "codemirror/mode/markdown/markdown";
import "codemirror/addon/edit/continuelist";

interface MermaidEditorProps {
  initialCode: string;
  onCodeChange: (code: string) => void;
}

const MermaidEditor: React.FC<MermaidEditorProps> = ({
  initialCode,
  onCodeChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<CodeMirror.Editor | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeVariables: {
        background: "#1e1e1e",
      },
    });
  }, []);

  useEffect(() => {
    if (!textareaRef.current || editorRef.current) return;

    const editor = CodeMirror.fromTextArea(textareaRef.current, {
      lineNumbers: true,
      mode: "markdown",
      theme: "material-darker",
      lineWrapping: true,
      autofocus: true,
      extraKeys: {
        Enter: "newlineAndIndentContinueMarkdownList",
        Tab: "indentMore",
        "Shift-Tab": "outdentMore",
      },
    });

    editor.setValue(initialCode);

    editor.on("change", (cm) => {
      const value = cm.getValue();
      onCodeChange(value);
      renderMermaid(value);
    });

    editorRef.current = editor;
    renderMermaid(initialCode);
    setTimeout(() => editor.refresh(), 0);

    return () => {
      editor.toTextArea();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    if (editorRef.current.getValue() !== initialCode) {
      editorRef.current.setValue(initialCode);
      renderMermaid(initialCode);
    }
  }, [initialCode]);

  const renderMermaid = async (code: string) => {
    if (!previewRef.current) return;

    try {
      await mermaid.parse(code);

      const { svg } = await mermaid.render(`m-${Date.now()}`, code);

      previewRef.current.innerHTML = svg;

      const svgEl = previewRef.current.querySelector("svg");
      if (svgEl) {
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
      }
    } catch (err: any) {
      previewRef.current.innerHTML = `<pre>${err.message}</pre>`;
    }
  };

  /* ===== Export helpers ===== */

  const exportSVG = () => {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;

    const blob = new Blob([svg.outerHTML], {
      type: "image/svg+xml;charset=utf-8",
    });

    download(blob, "diagram.svg");
  };

  const exportPNG = async () => {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new Blob([svg.outerHTML], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(svgData);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => blob && download(blob, "diagram.png"));
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(initialCode);
  };

  const download = (blob: Blob, filename: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mermaid-editor">
      <div className="editor-pane" data-title="Mermaid source">
        <div className="editor-content">
          <textarea ref={textareaRef} style={{ display: "none" }} />
        </div>
      </div>

      <div className="preview-pane" data-title="Preview">
        <div className="preview-toolbar">
          <button onClick={copyCode}>Copy</button>
          <button onClick={exportSVG}>SVG</button>
          <button onClick={exportPNG}>PNG</button>
        </div>

        <div className="preview-content" ref={previewRef} />
      </div>
    </div>
  );
};

export default MermaidEditor;
