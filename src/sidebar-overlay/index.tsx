import * as React from 'react'
import * as ReactDOM from 'react-dom'

import RibbonSidebarController from './ribbon-sidebar-controller'
import AnnotationsManager from './annotations-manager'
import { KeyboardActions } from 'src/sidebar-overlay/sidebar/types'
import {
    highlightAnnotations,
    highlightAndScroll,
    removeHighlights,
    makeHighlightMedium,
    removeMediumHighlights,
    sortAnnotationsByPosition,
} from './content_script/highlight-interactions'

export const setupRibbonAndSidebarUI = (
    target: HTMLElement,
    {
        annotationsManager,
        handleRemoveRibbon,
        insertOrRemoveTooltip,
        setRibbonSidebarRef,
        forceExpandRibbon = false,
        ...props
    }: {
        annotationsManager: AnnotationsManager
        handleRemoveRibbon: () => void
        insertOrRemoveTooltip: (isTooltipEnabled: boolean) => void
        setRibbonSidebarRef: any
        forceExpandRibbon?: boolean
    } & Partial<KeyboardActions>,
) => {
    ReactDOM.render(
        <RibbonSidebarController
            setRibbonSidebarRef={setRibbonSidebarRef}
            annotationsManager={annotationsManager}
            handleRemoveRibbon={handleRemoveRibbon}
            insertOrRemoveTooltip={insertOrRemoveTooltip}
            highlightAll={highlightAnnotations}
            highlightAndScroll={highlightAndScroll}
            removeHighlights={removeHighlights}
            makeHighlightMedium={makeHighlightMedium}
            removeMediumHighlights={removeMediumHighlights}
            sortAnnotationsByPosition={sortAnnotationsByPosition}
            forceExpand={forceExpandRibbon}
            {...props}
        />,
        target,
    )
}

export const destroyRibbonAndSidebarUI = (
    target: HTMLElement,
    shadowRoot: ShadowRoot = undefined,
) => {
    ReactDOM.unmountComponentAtNode(target)

    if (shadowRoot) {
        shadowRoot.removeChild(target)
    } else {
        document.body.removeChild(target)
    }
}
