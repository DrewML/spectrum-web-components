/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { html, LitElement, CSSResultArray, TemplateResult } from 'lit-element';

import menuStyles from './menu.css.js';

interface MenuItem extends HTMLElement {
    disabled: boolean;
    selected: boolean;
    tabIndex: number;
}

export interface MenuQueryRoleEventDetail {
    role: string;
}

/**
 * Spectrum Menu Component
 * @element sp-menu
 *
 */
export class Menu extends LitElement {
    public static get styles(): CSSResultArray {
        return [menuStyles];
    }

    public menuItems = [] as Element[];
    public focusedItemIndex = 0;
    public focusInItemIndex = 0;

    public get childRole(): string {
        return this.getAttribute('role') === 'menu' ? 'menuitem' : 'option';
    }

    public constructor() {
        super();
        this.handleKeydown = this.handleKeydown.bind(this);
        this.startListeningToKeyboard = this.startListeningToKeyboard.bind(
            this
        );
        this.stopListeningToKeyboard = this.stopListeningToKeyboard.bind(this);
        this.onClick = this.onClick.bind(this);
        this.addEventListener('click', this.onClick);
        this.addEventListener('focusin', this.startListeningToKeyboard);
        this.addEventListener('focusout', this.stopListeningToKeyboard);
    }

    public focus(): void {
        if (this.menuItems.length === 0) {
            return;
        }

        const focusInItem = this.menuItems[this.focusInItemIndex] as MenuItem;
        this.focusedItemIndex = this.focusInItemIndex;
        focusInItem.focus();
    }

    private onClick(event: Event): void {
        const path = event.composedPath();
        const target = path.find((el) => {
            if (!(el instanceof Element)) {
                return false;
            }
            return el.getAttribute('role') === this.childRole;
        }) as MenuItem;
        if (!target) {
            return;
        }
        this.prepareToCleanUp();
    }

    public startListeningToKeyboard(): void {
        if (this.menuItems.length === 0) {
            return;
        }
        this.addEventListener('keydown', this.handleKeydown);
    }

    public stopListeningToKeyboard(): void {
        this.removeEventListener('keydown', this.handleKeydown);
    }

    public handleKeydown(event: KeyboardEvent): void {
        const { code } = event;
        if (code === 'Tab') {
            this.prepareToCleanUp();
            return;
        }
        if (code !== 'ArrowDown' && code !== 'ArrowUp') {
            return;
        }
        event.preventDefault();
        const direction = code === 'ArrowDown' ? 1 : -1;
        this.focusMenuItemByOffset(direction);
    }

    public focusMenuItemByOffset(offset: number): void {
        const focusedItem = this.menuItems[this.focusedItemIndex] as MenuItem;
        this.focusedItemIndex =
            (this.menuItems.length + this.focusedItemIndex + offset) %
            this.menuItems.length;
        let itemToFocus = this.menuItems[this.focusedItemIndex] as MenuItem;
        while (itemToFocus.disabled) {
            this.focusedItemIndex =
                (this.menuItems.length + this.focusedItemIndex + offset) %
                this.menuItems.length;
            itemToFocus = this.menuItems[this.focusedItemIndex] as MenuItem;
        }
        itemToFocus.focus();
        focusedItem.tabIndex = -1;
    }

    private prepareToCleanUp(): void {
        document.addEventListener(
            'focusout',
            () => {
                requestAnimationFrame(() => {
                    if (this.querySelector('[selected]')) {
                        const itemToBlur = this.menuItems[
                            this.focusInItemIndex
                        ] as MenuItem;
                        itemToBlur.tabIndex = -1;
                    }
                    this.updateSelectedItemIndex();
                    const itemToFocus = this.menuItems[
                        this.focusInItemIndex
                    ] as MenuItem;
                    itemToFocus.tabIndex = 0;
                });
            },
            { once: true }
        );
    }

    public updateSelectedItemIndex(): void {
        let index = this.menuItems.length - 1;
        let item = this.menuItems[index] as MenuItem;
        while (index && item && !item.selected) {
            index -= 1;
            item = this.menuItems[index] as MenuItem;
        }
        this.focusedItemIndex = index;
        this.focusInItemIndex = index;
    }

    public handleSlotchange(): void {
        this.menuItems = [
            ...this.querySelectorAll(`[role="${this.childRole}"]`),
        ];
        if (!this.menuItems || this.menuItems.length === 0) {
            return;
        }
        this.updateSelectedItemIndex();
        const focusInItem = this.menuItems[this.focusInItemIndex] as MenuItem;
        focusInItem.tabIndex = 0;
    }

    public render(): TemplateResult {
        return html`
            <slot @slotchange=${this.handleSlotchange}></slot>
        `;
    }

    public connectedCallback(): void {
        super.connectedCallback();
        if (!this.hasAttribute('role')) {
            const queryRoleEvent = new CustomEvent('sp-menu-query-role', {
                bubbles: true,
                composed: true,
                detail: {
                    role: '',
                },
            });
            this.dispatchEvent(queryRoleEvent);
            this.setAttribute('role', queryRoleEvent.detail.role || 'menu');
        }
    }
}

declare global {
    interface GlobalEventHandlersEventMap {
        'sp-menu-query-role': CustomEvent<MenuQueryRoleEventDetail>;
    }
}
