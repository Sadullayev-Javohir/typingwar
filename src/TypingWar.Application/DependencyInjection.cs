using System.Reflection;
using FluentValidation;
using Mapster;
using MapsterMapper;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using TypingWar.Application.Common.Behaviors;

namespace TypingWar.Application;

/// <summary>Application qatlami xizmatlarini DI ga ro'yxatdan o'tkazadi.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // MediatR — barcha Command/Query handlerlar + validatsiya pipeline
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(assembly);
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });

        // FluentValidation — barcha validatorlar
        services.AddValidatorsFromAssembly(assembly);

        // Mapster — DTO mapping (AutoMapper EMAS)
        var config = TypeAdapterConfig.GlobalSettings;
        config.Scan(assembly);
        services.AddSingleton(config);
        services.AddScoped<IMapper, ServiceMapper>();

        return services;
    }
}
