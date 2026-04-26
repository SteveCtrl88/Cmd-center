"use client";

import * as React from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans Serif", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "ui-serif, Georgia, serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, monospace" },
];

const TEXT_COLORS = [
  "#0f172a", // slate-900 (default-ish)
  "#475569", // slate-600
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

interface RichEditorProps {
  /** Current HTML body. Pass empty string for a blank note. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Called when the user drops a file the editor doesn't handle (e.g. PDF). */
  onAttachFile?: (file: File) => void;
}

export function RichEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  className,
  onAttachFile,
}: RichEditorProps) {
  // Stash the latest onChange so the editor instance can stay stable.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onAttachRef = React.useRef(onAttachFile);
  React.useEffect(() => {
    onAttachRef.current = onAttachFile;
  }, [onAttachFile]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4",
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-md max-w-full my-3",
        },
      }),
      TaskList.configure({ HTMLAttributes: { class: "list-none pl-0" } }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: "flex items-start gap-2 my-1" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] dark:prose-invert " +
          // Reasonable defaults for the body — we use TipTap's tag output
          // and let prose handle most styling.
          "prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg " +
          "prose-p:my-2 prose-blockquote:border-l-2 prose-blockquote:pl-3 " +
          "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 " +
          "prose-code:before:content-none prose-code:after:content-none " +
          "prose-pre:rounded prose-pre:bg-muted prose-pre:p-3",
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        for (const file of files) {
          if (file.type.startsWith("image/")) uploadImageToEditor(view, file);
          else if (onAttachRef.current) onAttachRef.current(file);
        }
        return true;
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0) return false;
        for (const file of files) {
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            uploadImageToEditor(view, file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      onChangeRef.current(editor.getHTML());
    },
  });

  // Re-sync when value prop changes from the outside (e.g. opening a different note)
  React.useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col rounded-md border border-input", className)}>
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1.5 sticky top-0 bg-background z-10">
      <ToolbarBtn
        active={false}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={false}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      {/* Headings */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs gap-1"
          >
            <Type className="h-3.5 w-3.5" />
            {currentBlockLabel(editor)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="h-4 w-4 mr-2" /> Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4 mr-2" /> Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-4 w-4 mr-2" /> Heading 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font family */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
            Font
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Font family</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FONT_FAMILIES.map((f) => (
            <DropdownMenuItem
              key={f.label}
              onClick={() => {
                if (f.value)
                  editor.chain().focus().setFontFamily(f.value).run();
                else editor.chain().focus().unsetFontFamily().run();
              }}
            >
              <span style={f.value ? { fontFamily: f.value } : {}}>{f.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      <ToolbarBtn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (⌘B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (⌘I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (⌘U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        <Code className="h-4 w-4" />
      </ToolbarBtn>

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Text color"
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-5 gap-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Set color ${c}`}
                onClick={() => editor.chain().focus().setColor(c).run()}
                className="h-6 w-6 rounded border border-border"
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="h-6 w-6 rounded border border-border bg-transparent text-[10px]"
              title="Clear color"
            >
              ✕
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Divider />

      <ToolbarBtn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list"
      >
        <ListChecks className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code block"
      >
        <Code className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        active={editor.isActive("link")}
        onClick={() => {
          const previousUrl = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Enter URL", previousUrl ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
        }}
        title="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarBtn>

      <ToolbarBtn
        active={false}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            uploadImageToEditor(editor.view, file);
          };
          input.click();
        }}
        title="Insert image"
      >
        <ImageIcon className="h-4 w-4" />
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  children,
  disabled,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-secondary text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}

function currentBlockLabel(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "H1";
  if (editor.isActive("heading", { level: 2 })) return "H2";
  if (editor.isActive("heading", { level: 3 })) return "H3";
  return "Text";
}

/**
 * Upload a single image File via the API and insert <img> at the current
 * editor position. Used by handleDrop, handlePaste, and the toolbar button.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uploadImageToEditor(view: any, file: File) {
  const reader = new FileReader();
  reader.onload = async () => {
    // Optimistic insert: show local preview immediately, then swap to the
    // Cloudinary URL when upload completes.
    const previewSrc = reader.result as string;
    const { state, dispatch } = view;
    const placeholderId = `img-${Date.now()}-${Math.random()}`;
    const node = state.schema.nodes.image.create({
      src: previewSrc,
      alt: file.name,
      "data-uploading": placeholderId,
    });
    dispatch(state.tr.replaceSelectionWith(node));

    try {
      // Direct-to-Cloudinary upload bypasses Vercel's 4.5MB body limit,
      // which would otherwise reject any image larger than ~4MB.
      const { uploadDirect } = await import("@/lib/cloudinary-upload");
      const data = await uploadDirect(file, { resourceType: "image" });

      // Replace any image with our placeholder data attribute with the real URL.
      const newState = view.state;
      // ProseMirror Node type is hard to import without polluting the public
      // surface; minimal local shape is sufficient.
      type PMNode = {
        type: { name: string };
        attrs: Record<string, unknown>;
      };
      newState.doc.descendants((node: PMNode, pos: number) => {
        if (
          node.type.name === "image" &&
          node.attrs["data-uploading"] === placeholderId
        ) {
          view.dispatch(
            newState.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              src: data.url,
              "data-uploading": null,
            })
          );
        }
      });
    } catch (err) {
      toast.error(`Image upload failed: ${(err as Error).message}`);
    }
  };
  reader.readAsDataURL(file);
}
