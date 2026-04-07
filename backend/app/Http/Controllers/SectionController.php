<?php

namespace App\Http\Controllers;

use App\Models\Section;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Section::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate(['name' => 'required|string']);
        $section = Section::create($validated);
        return response()->json($section, 201);
    }

    public function show(Section $section)
    {
        return response()->json($section);
    }

    public function update(Request $request, Section $section)
    {
        $validated = $request->validate(['name' => 'required|string']);
        $section->update($validated);
        return response()->json($section);
    }

    public function destroy(Section $section)
    {
        $section->delete();
        return response()->json(null, 204);
    }
}
