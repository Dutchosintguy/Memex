import expect from 'expect'

import {
    FetchPageDataError,
    FetchPageDataErrorType,
} from 'src/page-analysis/background/fetch-page-data-error'
import { PostReceiveProcessor } from './post-receive-processor'
import * as DATA from './post-receive-processor.test.data'
import { FetchPageDataProcessor } from 'src/page-analysis/background/fetch-page-data-processor'

const createMockStdPageFetcher = ({
    errorType,
}: {
    errorType?: FetchPageDataErrorType
}) => ({ url }) => ({
    cancel: () => undefined,
    run: async () => {
        if (errorType) {
            throw new FetchPageDataError('', errorType)
        }

        return {
            content: { title: 'test title', fullText: 'some test text' },
            url,
        }
    },
})

function setupTest({ pageFetcher = createMockStdPageFetcher({}) }) {
    const mockPagePipeline = async ({ pageDoc }) => ({
        url: pageDoc.url,
        fullUrl: pageDoc.url,
        fullTitle: pageDoc.content.title,
        domain: pageDoc.url,
        hostname: pageDoc.url,
        tags: [],
        terms: [],
        urlTerms: [],
        titleTerms: [],
        text: pageDoc.content.fullText,
    })

    const mockBacklog = {
        tmp: null,
        enqueueEntry: ({ url }) => {
            mockBacklog.tmp = url
        },
    }

    return {
        processor: new PostReceiveProcessor({
            pageFetchBacklog: mockBacklog as any,
            fetchPageData: new FetchPageDataProcessor({
                pagePipeline: mockPagePipeline,
                fetchPageData: pageFetcher,
            }),
        }).processor,
        mockBacklog,
    }
}

describe('sync post-receive processor', () => {
    it('should not process non-page-create sync entries', async () => {
        const { processor } = setupTest({})

        expect(await processor({ entry: DATA.bookmarkCreateA })).toEqual({
            entry: DATA.bookmarkCreateA,
        })
        expect(await processor({ entry: DATA.pageModifyA })).toEqual({
            entry: DATA.pageModifyA,
        })
        expect(await processor({ entry: DATA.pageCreateA })).not.toEqual({
            entry: DATA.pageCreateA,
        })
    })

    it('should not process incoming page-create sync entries with data attached', async () => {
        const { processor } = setupTest({})

        expect(await processor({ entry: DATA.pageCreateB })).toEqual({
            entry: DATA.pageCreateB,
        })
    })

    it('should process a page-create sync entry, filling in missing data', async () => {
        const { processor } = setupTest({})

        expect(await processor({ entry: DATA.pageCreateA })).toEqual({
            entry: {
                ...DATA.pageCreateA,
                data: {
                    ...DATA.pageCreateA.data,
                    value: {
                        url: DATA.pageCreateA.data.pk,
                        fullUrl: DATA.pageCreateA.data.pk,
                        fullTitle: 'test title',
                        domain: DATA.pageCreateA.data.pk,
                        hostname: DATA.pageCreateA.data.pk,
                        tags: [],
                        terms: [],
                        urlTerms: [],
                        titleTerms: [],
                        text: 'some test text',
                    },
                },
            },
        })
    })

    it('should process a stub entry with URL as title on permanent failures', async () => {
        const { processor } = setupTest({
            pageFetcher: createMockStdPageFetcher({ errorType: 'permanent' }),
        })

        expect(await processor({ entry: DATA.pageCreateA })).toEqual({
            entry: {
                ...DATA.pageCreateA,
                data: {
                    ...DATA.pageCreateA.data,
                    value: {
                        url: DATA.pageCreateA.data.pk,
                        fullUrl: DATA.pageCreateA.data.pk,
                        fullTitle: DATA.pageCreateA.data.pk,
                        domain: DATA.pageCreateA.data.pk,
                        hostname: DATA.pageCreateA.data.pk,
                        tags: [],
                        terms: [],
                        urlTerms: [],
                        titleTerms: [],
                        text: undefined,
                    },
                },
            },
        })
    })

    it('should process a null entry on temporary failures', async () => {
        const { processor } = setupTest({
            pageFetcher: createMockStdPageFetcher({ errorType: 'temporary' }),
        })

        expect(await processor({ entry: DATA.pageCreateA })).toEqual({
            entry: null,
        })
    })

    it('should enqueue entry on page backlog in the case of a failure', async () => {
        const { processor, mockBacklog } = setupTest({
            pageFetcher: createMockStdPageFetcher({ errorType: 'temporary' }),
        })

        expect(mockBacklog.tmp).not.toBe(DATA.pageCreateA.data.pk)
        expect(mockBacklog.tmp).toBeNull()

        expect(await processor({ entry: DATA.pageCreateA })).toEqual({
            entry: null,
        })

        expect(mockBacklog.tmp).toBe(DATA.pageCreateA.data.pk)
    })
})
