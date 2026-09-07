using LibraryWebApi.Common;
using LibraryWebApi.Controllers;
using LibraryWebApi.DTOs;
using LibraryWebApi.Models;
using LibraryWebApi.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryWebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BooksController : ControllerBase
{
    private readonly IBookRepository _bookRepository;

    public BooksController(IBookRepository bookRepository)
    {
        _bookRepository = bookRepository;
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

    [HttpDelete("{id:int}")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> Delete(int id)
    {
        _ = await _bookRepository.GetByIdAsync(id) ?? throw Errors.BookNotFound;

        if (await _bookRepository.HasBorrowHistoryAsync(id))
        {
            throw Errors.BookHasActiveBorrows;
        }

        await _bookRepository.DeleteAsync(id);
        return Ok(ApiResponse<object?>.SuccessResponse(null, "Book deleted successfully"));
    }

    private static BookResponse ToResponse(Book book)
    {
        return new BookResponse
        {
            BookId = book.BookId,
            Title = book.Title,
            Isbn = book.Isbn,
            Genre = book.Genre,
            AuthorName = book.AuthorName,
            TotalCopies = book.TotalCopies,
            AvailableCopies = book.AvailableCopies
        };
    }
}
