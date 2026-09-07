namespace LibraryWebApi.Models;

public class Book
{
    public int BookId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Isbn { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public int TotalCopies { get; set; }
    public int AvailableCopies { get; set; }

    public List<BorrowRecord> BorrowRecords { get; set; } = new();
}
