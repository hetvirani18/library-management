namespace LibraryWebApi.Common;

public class Pagination
{
    public bool HasNext { get; set; }
    public int? NextCursor { get; set; }
}

public class Paginated<T>
{
    public List<T> Data { get; set; } = new();
    public Pagination Pagination { get; set; } = new();

    public Paginated<TOut> Map<TOut>(Func<T, TOut> selector)
    {
        return new Paginated<TOut>
        {
            Data = Data.Select(selector).ToList(),
            Pagination = Pagination
        };
    }
}

public class PageQuery
{
    private const int DefaultLimit = 20;
    private const int MaxLimit = 100;

    private int _cursor;
    private int _limit = DefaultLimit;

    public int Cursor
    {
        get => _cursor;
        set => _cursor = Math.Max(0, value);
    }

    public int Limit
    {
        get => _limit;
        set => _limit = Math.Clamp(value, 1, MaxLimit);
    }
}
