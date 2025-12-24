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
      const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code);
      previewRef.current.innerHTML = svg;
    } catch (err: any) {
      previewRef.current.innerHTML = `<pre style="color:red;">${err.message}</pre>`;
    }
  };

  return (
    <div className="mermaid-editor">
      <div className="editor-pane">
        <textarea ref={textareaRef} style={{ display: "none" }} />
      </div>

      <div className="preview-pane" ref={previewRef} />
    </div>
  );
};

export default MermaidEditor;
