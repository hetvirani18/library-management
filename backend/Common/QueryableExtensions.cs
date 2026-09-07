using Microsoft.EntityFrameworkCore;

namespace LibraryWebApi.Common;

public static class QueryableExtensions
{
    public static async Task<Paginated<T>> ToPaginatedAsync<T>(this IQueryable<T> query, PageQuery page)
    {
        var items = await query.Skip(page.Cursor).Take(page.Limit + 1).ToListAsync();

        var hasNext = items.Count > page.Limit;
        if (hasNext)
        {
            items.RemoveAt(items.Count - 1);
        }

        return new Paginated<T>
        {
            Data = items,
            Pagination = new Pagination
            {
                HasNext = hasNext,
                NextCursor = hasNext ? page.Cursor + page.Limit : null
            }
        };
    }
}
