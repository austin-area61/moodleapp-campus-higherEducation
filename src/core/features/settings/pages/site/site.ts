// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';

import { CoreSettingsHandlerToDisplay } from '../../services/settings-delegate';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreNavigator } from '@services/navigator';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSettingsHandlersSource } from '@features/settings/classes/settings-handlers-source';
import { CoreSettingsHelper } from '@features/settings/services/settings-helper';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Page that displays the list of site settings pages.
 */
@Component({
    selector: 'page-core-site-preferences',
    templateUrl: 'site.html',
})
export class CoreSitePreferencesPage implements AfterViewInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    handlers: CoreListItemsManager<CoreSettingsHandlerToDisplay>;

    protected siteId: string;
    protected sitesObserver: CoreEventObserver;
    protected isDestroyed = false;

    constructor() {
        this.siteId = CoreSites.getCurrentSiteId();

        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreSettingsHandlersSource, []);

        this.handlers = new CoreListItemsManager(source, CoreSitePreferencesPage);

        this.sitesObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.refreshData();
        }, this.siteId);
    }

    /**
     * View loaded.
     */
    async ngAfterViewInit(): Promise<void> {
        const pageToOpen = CoreNavigator.getRouteParam('page');

        try {
            await this.fetchData();
        } finally {
            const handler = pageToOpen ? this.handlers.items.find(handler => handler.page == pageToOpen) : undefined;

            if (handler) {
                this.handlers.watchSplitViewOutlet(this.splitView);

                await this.handlers.select(handler);
            } else {
                await this.handlers.start(this.splitView);
            }
        }
    }

    /**
     * Fetch Data.
     */
    protected async fetchData(): Promise<void> {
        await this.handlers.load();
    }

    /**
     * Syncrhonizes the site.
     */
    async synchronize(): Promise<void> {
        try {
            // Using syncOnlyOnWifi false to force manual sync.
            await CoreSettingsHelper.synchronizeSite(false, this.siteId);
        } catch (error) {
            if (this.isDestroyed) {
                return;
            }
            CoreDomUtils.showErrorModalDefault(error, 'core.settings.sitesyncfailed', true);
        }

    }

    /**
     * Returns true if site is beeing synchronized.
     *
     * @return True if site is beeing synchronized, false otherwise.
     */
    isSynchronizing(): boolean {
        return !!CoreSettingsHelper.getSiteSyncPromise(this.siteId);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: IonRefresher): void {
        this.handlers.getSource().setDirty(true);
        this.fetchData().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.sitesObserver?.off();
        this.handlers.destroy();
    }

}
