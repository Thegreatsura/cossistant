import type { ReactElement } from "react";

import { useSupportNavigation } from "../store";
import { Text } from "../text";
import { Button } from "./button";
import Icon from "./icons";

export function NavigationTab(): ReactElement {
	const { current, navigate } = useSupportNavigation();

	return (
		<div className="flex w-full items-center justify-center gap-2">
			<Button
				onClick={() => navigate({ page: "HOME" })}
				variant={current.page === "HOME" ? "tab-selected" : "tab"}
			>
				<Icon
					filledOnHover
					name="home"
					variant={current.page === "HOME" ? "filled" : "default"}
				/>
				<Text as="span" textKey="component.navigation.home" />
			</Button>
			<Button
				onClick={() => navigate({ page: "ARTICLES" })}
				variant={current.page === "ARTICLES" ? "tab-selected" : "tab"}
			>
				<Icon
					filledOnHover
					name="articles"
					variant={current.page === "ARTICLES" ? "filled" : "default"}
				/>
				<Text as="span" textKey="component.navigation.articles" />
			</Button>
		</div>
	);
}
