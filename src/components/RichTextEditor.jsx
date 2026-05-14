import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

const ICONS = {
  bold: (
    <path d="M7 5h5.2a3 3 0 0 1 0 6H7zm0 6h6a3.2 3.2 0 0 1 0 6H7zm0-6v12" />
  ),
  italic: <path d="M10 5h6M8 17h6M13 5l-2 12" />,
  underline: <path d="M7 5v5a5 5 0 0 0 10 0V5M6 20h12" />,
  strike: <path d="M7 9a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4M5 12h14M17 15a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4" />,
  code: <path d="m9 8-4 4 4 4M15 8l4 4-4 4M13 6l-2 12" />,
  bulletList: <path d="M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  orderedList: <path d="M10 6h9M10 12h9M10 18h9M4 5h2v4M4 9h4M4 13h3.5L4 17h4M4 20h4" />,
  quote: <path d="M8 8H5v5h3v-3a4 4 0 0 0-3-4M19 8h-3v5h3v-3a4 4 0 0 0-3-4" />,
  rule: <path d="M5 12h14" />,
  link: <path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1l-.8.8M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8" />,
  unlink: <path d="m5 5 14 14M10 13a5 5 0 0 0 5.3 1.1M14 11a5 5 0 0 0-5.3-1.1M16.5 7.5l2-2a5 5 0 0 0-7.1-7.1l-.8.8M7.5 16.5l-2 2a5 5 0 0 0 7.1 7.1l.8-.8" />,
  clear: <path d="M4 20h16M7 16l-3-3 8-8 3 3-8 8zM14 6l4 4" />,
  undo: <path d="M9 7H4v5M4 12a8 8 0 1 0 2.3-5.7L4 8.5" />,
  redo: <path d="M15 7h5v5M20 12a8 8 0 1 1-2.3-5.7L20 8.5" />,
  alignLeft: <path d="M5 6h14M5 10h9M5 14h14M5 18h9" />,
  alignCenter: <path d="M5 6h14M8 10h8M5 14h14M8 18h8" />,
  alignRight: <path d="M5 6h14M10 10h9M5 14h14M10 18h9" />,
  alignJustify: <path d="M5 6h14M5 10h14M5 14h14M5 18h14" />,
};

function Icon({ name }) {
  return (
    <svg
      aria-hidden="true"
      className="editor-toolbar-icon"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {ICONS[name]}
      </g>
    </svg>
  );
}

function MenuButton({
  editor,
  isActive = false,
  icon,
  onClick,
  title,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={isActive ? "active" : ""}
      aria-pressed={isActive}
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={!editor || disabled}
    >
      <Icon name={icon} />
    </button>
  );
}

function BlockFormatSelect({ editor }) {
  const currentValue = (() => {
    if (!editor) {
      return "paragraph";
    }

    if (editor.isActive("heading", { level: 1 })) {
      return "heading-1";
    }

    if (editor.isActive("heading", { level: 2 })) {
      return "heading-2";
    }

    if (editor.isActive("heading", { level: 3 })) {
      return "heading-3";
    }

    return "paragraph";
  })();

  function handleChange(event) {
    const value = event.target.value;
    const chain = editor.chain().focus();

    if (value === "paragraph") {
      chain.setParagraph().run();
      return;
    }

    chain.toggleHeading({ level: Number(value.replace("heading-", "")) }).run();
  }

  return (
    <label className="editor-format-select">
      <span>Style</span>
      <select value={currentValue} onChange={handleChange} disabled={!editor}>
        <option value="paragraph">Normal text</option>
        <option value="heading-1">Heading 1</option>
        <option value="heading-2">Heading 2</option>
        <option value="heading-3">Heading 3</option>
      </select>
    </label>
  );
}

function EditorToolbar({ editor }) {
  function handleLink() {
    const previousUrl = editor.getAttributes("link").href;
    const nextUrl = window.prompt("Enter a link URL", previousUrl || "");

    if (nextUrl === null) {
      return;
    }

    if (nextUrl.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const href = /^https?:\/\//i.test(nextUrl) ? nextUrl : `https://${nextUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="editor-toolbar" aria-label="Text formatting controls">
      <div className="editor-toolbar-group">
        <BlockFormatSelect editor={editor} />
      </div>

      <div className="editor-toolbar-group" aria-label="Text style">
        <MenuButton
          editor={editor}
          icon="bold"
          title="Bold"
          isActive={editor?.isActive("bold") ?? false}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <MenuButton
          editor={editor}
          icon="italic"
          title="Italic"
          isActive={editor?.isActive("italic") ?? false}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <MenuButton
          editor={editor}
          icon="underline"
          title="Underline"
          isActive={editor?.isActive("underline") ?? false}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <MenuButton
          editor={editor}
          icon="strike"
          title="Strikethrough"
          isActive={editor?.isActive("strike") ?? false}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <MenuButton
          editor={editor}
          icon="code"
          title="Inline code"
          isActive={editor?.isActive("code") ?? false}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
      </div>

      <div className="editor-toolbar-group" aria-label="Lists and blocks">
        <MenuButton
          editor={editor}
          icon="bulletList"
          title="Bullet list"
          isActive={editor?.isActive("bulletList") ?? false}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <MenuButton
          editor={editor}
          icon="orderedList"
          title="Numbered list"
          isActive={editor?.isActive("orderedList") ?? false}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <MenuButton
          editor={editor}
          icon="quote"
          title="Block quote"
          isActive={editor?.isActive("blockquote") ?? false}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <MenuButton
          editor={editor}
          icon="rule"
          title="Horizontal line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
      </div>

      <div className="editor-toolbar-group" aria-label="Text alignment">
        <MenuButton
          editor={editor}
          icon="alignLeft"
          title="Align left"
          isActive={editor?.isActive({ textAlign: "left" }) ?? false}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <MenuButton
          editor={editor}
          icon="alignCenter"
          title="Align center"
          isActive={editor?.isActive({ textAlign: "center" }) ?? false}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <MenuButton
          editor={editor}
          icon="alignRight"
          title="Align right"
          isActive={editor?.isActive({ textAlign: "right" }) ?? false}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />
        <MenuButton
          editor={editor}
          icon="alignJustify"
          title="Justify"
          isActive={editor?.isActive({ textAlign: "justify" }) ?? false}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        />
      </div>

      <div className="editor-toolbar-group" aria-label="Links and cleanup">
        <MenuButton
          editor={editor}
          icon="link"
          title="Link"
          isActive={editor?.isActive("link") ?? false}
          onClick={handleLink}
        />
        <MenuButton
          editor={editor}
          icon="unlink"
          title="Unlink"
          disabled={!editor?.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        />
        <MenuButton
          editor={editor}
          icon="clear"
          title="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run()
          }
        />
      </div>

      <div className="editor-toolbar-group" aria-label="History">
        <MenuButton
          editor={editor}
          icon="undo"
          title="Undo"
          disabled={!editor?.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <MenuButton
          editor={editor}
          icon="redo"
          title="Redo"
          disabled={!editor?.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>
    </div>
  );
}

function RichTextEditor({
  ariaLabel = "Rich text evaluation draft",
  className = "rich-editor-content",
  content = "",
  onEditorReady,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TableKit,
      TextAlign.configure({
        types: ["heading", "paragraph", "tableCell", "tableHeader"],
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    onEditorReady?.(editor);

    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className={className} />
    </>
  );
}

export default RichTextEditor;
