using LibraryWebApi.Common;
using LibraryWebApi.Controllers;
using LibraryWebApi.DTOs;
using LibraryWebApi.Models;
using LibraryWebApi.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;

namespace LibraryWebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BooksController : ControllerBase
{
    private static readonly Dictionary<string, string> AllowedCoverContentTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp"
    };

    private const long MaxCoverImageBytes = 5 * 1024 * 1024;

    private readonly IBookRepository _bookRepository;
    private readonly IWebHostEnvironment _environment;

    public BooksController(IBookRepository bookRepository, IWebHostEnvironment environment)
    {
        _bookRepository = bookRepository;
        _environment = environment;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PageQuery page)
    {
        var books = await _bookRepository.GetAllAsync(page);
        return Ok(ApiResponse<Paginated<BookResponse>>.SuccessResponse(books.Map(ToResponse)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var book = await _bookRepository.GetByIdAsync(id) ?? throw Errors.BookNotFound;
        return Ok(ApiResponse<BookResponse>.SuccessResponse(ToResponse(book)));
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable([FromQuery] PageQuery page)
    {
        var books = await _bookRepository.GetAvailableAsync(page);
        return Ok(ApiResponse<Paginated<BookResponse>>.SuccessResponse(books.Map(ToResponse)));
    }

    [HttpGet("genre/{genre}")]
    public async Task<IActionResult> GetByGenre(string genre, [FromQuery] PageQuery page)
    {
        var books = await _bookRepository.GetByGenreAsync(genre, page);
        return Ok(ApiResponse<Paginated<BookResponse>>.SuccessResponse(books.Map(ToResponse)));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] PageQuery page)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            throw Errors.ValidationFailed;
        }

        var books = await _bookRepository.SearchAsync(q.Trim(), page);
        return Ok(ApiResponse<Paginated<BookResponse>>.SuccessResponse(books.Map(ToResponse)));
    }

    [HttpPost]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> Create(CreateBookRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var book = new Book
        {
            Title = request.Title.Trim(),
            Isbn = request.Isbn.Trim(),
            Genre = request.Genre.Trim(),
            AuthorName = request.AuthorName.Trim(),
            TotalCopies = request.TotalCopies,
            AvailableCopies = request.TotalCopies
        };

        await _bookRepository.AddAsync(book);
        return Ok(ApiResponse<BookResponse>.SuccessResponse(ToResponse(book), "Book added successfully"));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> Update(int id, UpdateBookRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var book = await _bookRepository.GetByIdAsync(id) ?? throw Errors.BookNotFound;

        var borrowedCopies = book.TotalCopies - book.AvailableCopies;

        book.Title = request.Title.Trim();
        book.Isbn = request.Isbn.Trim();
        book.Genre = request.Genre.Trim();
        book.AuthorName = request.AuthorName.Trim();
        book.TotalCopies = request.TotalCopies;
        book.AvailableCopies = Math.Max(0, request.TotalCopies - borrowedCopies);

        await _bookRepository.UpdateAsync(book);
        return Ok(ApiResponse<BookResponse>.SuccessResponse(ToResponse(book), "Book updated successfully"));
    }

    [HttpPost("{id:int}/cover")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> UploadCover(int id, IFormFile? file)
    {
        var book = await _bookRepository.GetByIdAsync(id) ?? throw Errors.BookNotFound;

        if (file is null || file.Length == 0 || file.Length > MaxCoverImageBytes
            || !AllowedCoverContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            throw Errors.InvalidCoverImage;
        }

        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "books");
        Directory.CreateDirectory(uploadsFolder);

        DeleteCoverFile(book.CoverImagePath);

        var fileName = $"{book.BookId}-{Guid.NewGuid():N}{extension}";
        await using (var stream = System.IO.File.Create(Path.Combine(uploadsFolder, fileName)))
        {
            await file.CopyToAsync(stream);
        }

        book.CoverImagePath = $"/uploads/books/{fileName}";
        await _bookRepository.UpdateAsync(book);

        return Ok(ApiResponse<BookResponse>.SuccessResponse(ToResponse(book), "Cover image uploaded successfully"));
    }

    [HttpDelete("{id:int}/cover")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> DeleteCover(int id)
    {
        var book = await _bookRepository.GetByIdAsync(id) ?? throw Errors.BookNotFound;

        DeleteCoverFile(book.CoverImagePath);
        book.CoverImagePath = null;
        await _bookRepository.UpdateAsync(book);

        return Ok(ApiResponse<BookResponse>.SuccessResponse(ToResponse(book), "Cover image removed successfully"));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> Delete(int id)
    {
        var book = await _bookRepository.GetByIdAsync(id) ?? throw Errors.BookNotFound;

        if (await _bookRepository.HasBorrowHistoryAsync(id))
        {
            throw Errors.BookHasActiveBorrows;
        }

        DeleteCoverFile(book.CoverImagePath);
        await _bookRepository.DeleteAsync(id);
        return Ok(ApiResponse<object?>.SuccessResponse(null, "Book deleted successfully"));
    }

    private void DeleteCoverFile(string? coverImagePath)
    {
        if (string.IsNullOrEmpty(coverImagePath))
        {
            return;
        }

        var relativePath = coverImagePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(_environment.WebRootPath, relativePath);

        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }
    }

    private BookResponse ToResponse(Book book)
    {
        return new BookResponse
        {
            BookId = book.BookId,
            Title = book.Title,
            Isbn = book.Isbn,
            Genre = book.Genre,
            AuthorName = book.AuthorName,
            TotalCopies = book.TotalCopies,
            AvailableCopies = book.AvailableCopies,
            CoverImageUrl = book.CoverImagePath is null ? null : $"{Request.Scheme}://{Request.Host}{book.CoverImagePath}"
        };
    }
}
