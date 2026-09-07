using System.ComponentModel.DataAnnotations;

namespace LibraryWebApi.DTOs;

public class CreateBookRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Isbn { get; set; } = string.Empty;

    [Required]
    public string Genre { get; set; } = string.Empty;

    [Required]
    public string AuthorName { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int TotalCopies { get; set; }
}

public class UpdateBookRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Isbn { get; set; } = string.Empty;

    [Required]
    public string Genre { get; set; } = string.Empty;

    [Required]
    public string AuthorName { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int TotalCopies { get; set; }
}

public class BookResponse
{
    public int BookId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Isbn { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public int TotalCopies { get; set; }
    public int AvailableCopies { get; set; }
}
