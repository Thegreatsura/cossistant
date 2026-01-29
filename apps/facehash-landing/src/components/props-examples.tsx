"use client";

import { Avatar, AvatarFallback, AvatarImage, Facehash } from "facehash";
import { useShape } from "./shape-context";

const COLORS = [
	"hsla(314, 100%, 80%, 1)",
	"hsla(58, 93%, 72%, 1)",
	"hsla(218, 92%, 72%, 1)",
	"hsla(19, 99%, 44%, 1)",
	"hsla(156, 86%, 40%, 1)",
];

const CUSTOM_COLORS = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];

type ExampleProps = {
	label: string;
	isDefault?: boolean;
	children: React.ReactNode;
};

function Example({ label, isDefault, children }: ExampleProps) {
	return (
		<div className="flex flex-col items-center gap-2">
			{children}
			<span className="text-[10px] text-[var(--muted-foreground)]">
				{label}
				{isDefault && (
					<span className="ml-1 text-[var(--foreground)]">(default)</span>
				)}
			</span>
		</div>
	);
}

type PropSectionProps = {
	name: string;
	code: string;
	children: React.ReactNode;
};

function PropSection({ name, code, children }: PropSectionProps) {
	return (
		<div className="mb-10">
			<p className="mb-2 font-medium text-xs">{name}</p>
			<pre className="mb-4 overflow-x-auto bg-[var(--foreground)]/[0.03] p-3 text-[11px] text-[var(--muted-foreground)]">
				<code>{code}</code>
			</pre>
			<div className="flex flex-wrap items-end gap-6">{children}</div>
		</div>
	);
}

export function PropsExamples() {
	const { borderRadius } = useShape();

	return (
		<div>
			{/* name - different strings = different faces */}
			<PropSection
				code={`import { Facehash } from "facehash";

<Facehash name="alice" />
<Facehash name="bob" />
<Facehash name="charlie" />`}
				name="name"
			>
				<Example label='"alice"'>
					<Facehash
						colors={COLORS}
						name="alice"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label='"bob"'>
					<Facehash
						colors={COLORS}
						name="bob"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label='"charlie"'>
					<Facehash
						colors={COLORS}
						name="charlie"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* size */}
			<PropSection
				code={`<Facehash name="facehash" size={32} />
<Facehash name="facehash" size={48} />
<Facehash name="facehash" size={64} />`}
				name="size"
			>
				<Example label="32">
					<Facehash
						colors={COLORS}
						name="facehash"
						size={32}
						style={{ borderRadius }}
					/>
				</Example>
				<Example isDefault label="40">
					<Facehash
						colors={COLORS}
						name="facehash"
						size={40}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="48">
					<Facehash
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="64">
					<Facehash
						colors={COLORS}
						name="facehash"
						size={64}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* colors */}
			<PropSection
				code={`<Facehash name="facehash" colors={["#264653", "#2a9d8f", "#e9c46a"]} />`}
				name="colors"
			>
				<Example label="default">
					<Facehash
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="custom">
					<Facehash
						colors={CUSTOM_COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* intensity3d */}
			<PropSection
				code={`<Facehash name="facehash" intensity3d="none" />
<Facehash name="facehash" intensity3d="subtle" />
<Facehash name="facehash" intensity3d="dramatic" />`}
				name="intensity3d"
			>
				<Example label="none">
					<Facehash
						colors={COLORS}
						intensity3d="none"
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="subtle">
					<Facehash
						colors={COLORS}
						intensity3d="subtle"
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="medium">
					<Facehash
						colors={COLORS}
						intensity3d="medium"
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example isDefault label="dramatic">
					<Facehash
						colors={COLORS}
						intensity3d="dramatic"
						name="facehash"
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* showInitial */}
			<PropSection
				code={`<Facehash name="facehash" showInitial={true} />
<Facehash name="facehash" showInitial={false} />`}
				name="showInitial"
			>
				<Example isDefault label="true">
					<Facehash
						colors={COLORS}
						name="facehash"
						showInitial={true}
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
				<Example label="false">
					<Facehash
						colors={COLORS}
						name="facehash"
						showInitial={false}
						size={48}
						style={{ borderRadius }}
					/>
				</Example>
			</PropSection>

			{/* variant */}
			<PropSection
				code={`<Facehash name="facehash" variant="gradient" />
<Facehash name="facehash" variant="solid" />`}
				name="variant"
			>
				<Example isDefault label="gradient">
					<Facehash
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
						variant="gradient"
					/>
				</Example>
				<Example label="solid">
					<Facehash
						colors={COLORS}
						name="facehash"
						size={48}
						style={{ borderRadius }}
						variant="solid"
					/>
				</Example>
			</PropSection>

			{/* Avatar with fallback - optional wrapper */}
			<div className="relative mt-16 pt-10">
				{/* Full-width top border */}
				<div className="-translate-x-1/2 absolute top-0 left-1/2 w-screen border-[var(--border)] border-t border-dashed" />
				<p className="mb-6 text-[var(--muted-foreground)] text-xs">
					need an image with fallback? use the Avatar wrapper:
				</p>
				<PropSection
					code={`import { Avatar, AvatarImage, AvatarFallback } from "facehash";

<Avatar>
  <AvatarImage src="/photo.jpg" />
  <AvatarFallback name="anthony" />
</Avatar>`}
					name="Avatar"
				>
					<Example label="image loads">
						<Avatar
							style={{
								width: 48,
								height: 48,
								borderRadius,
								overflow: "hidden",
							}}
						>
							<AvatarImage
								alt="anthony"
								src="https://pbs.twimg.com/profile_images/1952043514692280321/v4gOT-jg_400x400.jpg"
							/>
							<AvatarFallback name="anthony" />
						</Avatar>
					</Example>
					<Example label="image fails">
						<Avatar
							style={{
								width: 48,
								height: 48,
								borderRadius,
								overflow: "hidden",
							}}
						>
							<AvatarImage alt="anthony" src="/broken-image.jpg" />
							<AvatarFallback
								facehashProps={{ colors: COLORS }}
								name="anthony"
							/>
						</Avatar>
					</Example>
					<Example label="no image">
						<Avatar
							style={{
								width: 48,
								height: 48,
								borderRadius,
								overflow: "hidden",
							}}
						>
							<AvatarFallback
								facehashProps={{ colors: COLORS }}
								name="anthony"
							/>
						</Avatar>
					</Example>
				</PropSection>
			</div>
		</div>
	);
}
